// src/app/api/twilio-webhook/route.ts
import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { db } from "~/server/db";

const twilioWebhookSchema = z.object({
  From: z.string().startsWith("whatsapp:"),
  To: z.string().startsWith("whatsapp:"),
  Body: z.string().optional(),
  MessageSid: z.string(),
  NumMedia: z.string().transform(Number).default("0"),
  ProfileName: z.string().optional(),
}).passthrough();

export async function POST(req: NextRequest) {
  let rawPayload;
  try {
    const formData = await req.formData();
    rawPayload = Object.fromEntries(formData.entries());
    console.log("✅ Webhook received (raw form data):", rawPayload);
  } catch (error) {
    console.error("❌ Error parsing raw Twilio webhook payload:", error);
    return new Response("Error parsing request body", { status: 400 });
  }

  let validatedInput;
  try {
    validatedInput = twilioWebhookSchema.parse(rawPayload);
    console.log("✅ Webhook payload validated:", validatedInput);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Webhook payload validation error:", error.errors);
      return NextResponse.json(
        { message: "Invalid webhook payload", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("❌ Unknown validation error:", error);
    return NextResponse.json({ message: "Internal Server Error during validation" }, { status: 500 });
  }

  const mediaUrls: string[] = [];
  if (validatedInput.NumMedia > 0) {
    for (let i = 0; i < validatedInput.NumMedia; i++) {
      const mediaUrlKey = `MediaUrl${i}`;
      const mediaUrl = formData.get(mediaUrlKey);
      if (typeof mediaUrl === 'string') {
        mediaUrls.push(mediaUrl);
      }
    }
    console.log("Media URLs found:", mediaUrls);
  }

  try {
    const messageType = validatedInput.NumMedia > 0 ? 'media' : 'text';
    const messageBody = validatedInput.Body || (messageType === 'media' ? '[Media Message]' : null);
    const firstMediaUrl = mediaUrls.length > 0 ? mediaUrls[0] : null;

    const newMessage = await db.whatsappMessage.create({
      data: {
        whatsappMessageId: validatedInput.MessageSid,
        senderPhoneNumber: validatedInput.From,
        receiverPhoneNumber: validatedInput.To,
        messageBody: messageBody,
        messageType: messageType,
        mediaUrl: firstMediaUrl,
        profileName: validatedInput.ProfileName,
        isIncoming: true,
        status: 'received',
      },
    });

    console.log("✅ Message successfully saved to Supabase:", newMessage);

    return new Response("<Response></Response>", {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });

  } catch (error) {
    console.error("❌ Error saving message to Supabase via Prisma:", error);
    console.error("Full error details:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return NextResponse.json(
      { message: "Internal Server Error during database operation" },
      { status: 500 }
    );
  }
}