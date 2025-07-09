// src/app/api/twilio-webhook/route.ts
import { NextResponse, NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  let rawPayload;
  try {
    // Explicitly use formData() for application/x-www-form-urlencoded
    const formData = await req.formData();
    rawPayload = Object.fromEntries(formData.entries());

    console.log("✅ Webhook received");
    console.log("Raw Payload:", rawPayload);

    // If you reach here, the parsing was successful.
    // The previous Zod validation logic would go here if re-enabled.

    return NextResponse.json({
      message: "Success - Processed by simplified webhook"
    }, { status: 200 });

  } catch (error) {
    console.error("❌ Error in webhook handler (parsing or processing):", error);
    // Log detailed error for debugging
    if (error instanceof Error) {
      console.error("Error Name:", error.name);
      console.error("Error Message:", error.message);
      console.error("Error Stack:", error.stack);
    } else {
      console.error("Unknown error type:", error);
    }

    // Return a 500 in case of any unhandled error during parsing or processing
    return new Response("Internal Server Error during webhook processing", { status: 500 });
  }
}