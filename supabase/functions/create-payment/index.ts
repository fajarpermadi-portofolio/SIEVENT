import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import midtrans from "https://esm.sh/midtrans-client";

serve(async (req) => {
  try {
    const { user_id, event_id } = await req.json();

    if (!user_id || !event_id) {
      return new Response("Invalid payload", { status: 400 });
    }

    // init supabase admin
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ambil event
    const { data: event, error: eventErr } = await supabase
      .from("events")
      .select("name, price")
      .eq("id", event_id)
      .single();

    if (eventErr || !event) {
      return new Response("Event not found", { status: 404 });
    }

    if (event.price <= 0) {
      return new Response("Event is free", { status: 400 });
    }

    // buat record pembayaran
    const { data: payment, error: payErr } = await supabase
      .from("event_payments")
      .insert({
        event_id,
        user_id,
        amount: event.price,
        status: "pending",
        payment_method: "midtrans"
      })
      .select()
      .single();

    if (payErr || !payment) {
      return new Response("Failed to create payment", { status: 500 });
    }

    // init midtrans snap
    const snap = new midtrans.Snap({
      isProduction: false,
      serverKey: Deno.env.get("MIDTRANS_SERVER_KEY"),
    });

    const transaction = await snap.createTransaction({
      transaction_details: {
        order_id: payment.id,
        gross_amount: event.price,
      },
      item_details: [
        {
          id: event_id,
          price: event.price,
          quantity: 1,
          name: event.name,
        },
      ],
      customer_details: {
        user_id,
      },
    });

    // simpan snap token
    await supabase
      .from("event_payments")
      .update({ snap_token: transaction.token })
      .eq("id", payment.id);

    return new Response(
      JSON.stringify({
        snapToken: transaction.token,
        clientKey: Deno.env.get("MIDTRANS_CLIENT_KEY"),
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response("Server error", { status: 500 });
  }
});
