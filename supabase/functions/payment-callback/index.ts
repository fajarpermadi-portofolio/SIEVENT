import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import crypto from "https://deno.land/std@0.224.0/crypto/mod.ts";

serve(async (req) => {
  try {
    const body = await req.json();

    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
    } = body;

    // ============================
    // VALIDASI SIGNATURE MIDTRANS
    // ============================
    const serverKey = Deno.env.get("MIDTRANS_SERVER_KEY")!;
    const rawSignature = `${order_id}${status_code}${gross_amount}${serverKey}`;

    const hashBuffer = await crypto.subtle.digest(
      "SHA-512",
      new TextEncoder().encode(rawSignature)
    );

    const expectedSignature = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (expectedSignature !== signature_key) {
      return new Response("Invalid signature", { status: 401 });
    }

    // ============================
    // INIT SUPABASE ADMIN
    // ============================
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ============================
    // AMBIL PAYMENT
    // ============================
    const { data: payment } = await supabase
      .from("event_payments")
      .select("*")
      .eq("id", order_id)
      .single();

    if (!payment) {
      return new Response("Payment not found", { status: 404 });
    }

    // ============================
    // CEGAH DOUBLE PROCESS
    // ============================
    if (payment.status === "paid") {
      return new Response("Already processed", { status: 200 });
    }

    // ============================
    // HANDLE STATUS TRANSAKSI
    // ============================
    if (
      transaction_status === "settlement" ||
      transaction_status === "capture"
    ) {
      // update payment
      await supabase
        .from("event_payments")
        .update({ status: "paid" })
        .eq("id", order_id);

      // insert registration jika belum ada
      await supabase
        .from("event_registrations")
        .insert({
          event_id: payment.event_id,
          user_id: payment.user_id,
        });

      return new Response("Payment success", { status: 200 });
    }

    if (
      transaction_status === "cancel" ||
      transaction_status === "expire" ||
      transaction_status === "deny"
    ) {
      await supabase
        .from("event_payments")
        .update({ status: "failed" })
        .eq("id", order_id);
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response("Server error", { status: 500 });
  }
});
