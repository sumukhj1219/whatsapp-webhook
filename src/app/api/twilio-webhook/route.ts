// src/app/api/twilio-webhook/route.ts
import { NextResponse, NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const twilioWebhookSchema = z.object({
  From: z.string().startsWith("whatsapp:"),
  To: z.string().startsWith("whatsapp:"),
  Body: z.string().optional(),
  MessageSid: z.string(),
  NumMedia: z.string().transform(Number).default("0"),
  ProfileName: z.string().optional(),
}).passthrough();

const propertyInquirySchema = z.object({
  inquiryDateTime: z.string().optional(),
  type: z.string().optional(),
  transaction: z.string().optional(),
  bhkConfig: z.string().optional(),
  address: z.string().optional(),
  pinCode: z.string().optional(),
  area: z.string().optional(),
  price: z.string().optional(),
  condition: z.string().optional(),
  floor: z.string().optional(),
  features: z.string().optional(),
  contact: z.string().optional(),
});

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

  let newMessage;
  try {
    const messageType = validatedInput.NumMedia > 0 ? 'media' : 'text';
    const messageBody = validatedInput.Body || (messageType === 'media' ? '[Media Message]' : null);
    const firstMediaUrl = mediaUrls.length > 0 ? mediaUrls[0] : null;

    newMessage = await prisma.whatsappMessage.create({
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

    console.log("✅ Original WhatsApp message successfully saved to Supabase:", newMessage);

    if (messageBody) {
      try {
        const prompt = `Extract the following real estate inquiry details from the message below into a JSON object. If a field is not present or clear, omit it.
        Fields to extract:
        - inquiryDateTime (e.g., "today", "tomorrow 3pm", "July 10th")
        - type (e.g., "Apartment", "Villa", "Land", "Commercial")
        - transaction (e.g., "Buy", "Rent", "Lease")
        - bhkConfig (e.g., "2BHK", "3BHK", "1RK", "4BHK Duplex")
        - address (specific address or general area like "Whitefield, Bangalore")
        - pinCode (6-digit Indian PIN code)
        - area (e.g., "1200 sqft", "1 Acre", "2000 sq ft")
        - price (e.g., "50 Lakhs", "1.2 Crore", "80,000 per month")
        - condition (e.g., "New", "Resale", "Under Construction", "Ready to Move")
        - floor (e.g., "Ground Floor", "10th Floor", "Penthouse")
        - features (comma-separated list, e.g., "Swimming pool, Gym, Balcony, Parking")
        - contact (any phone number or email mentioned in the message, if different from sender)

        Message: "${messageBody}"`;

        const chatHistory = [];
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });

        const payload = {
          contents: chatHistory,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                inquiryDateTime: { type: "STRING" },
                type: { type: "STRING" },
                transaction: { type: "STRING" },
                bhkConfig: { type: "STRING" },
                address: { type: "STRING" },
                pinCode: { type: "STRING" },
                area: { type: "STRING" },
                price: { type: "STRING" },
                condition: { type: "STRING" },
                floor: { type: "STRING" },
                features: { type: "STRING" },
                contact: { type: "STRING" },
              },
              propertyOrdering: [
                "inquiryDateTime", "type", "transaction", "bhkConfig", "address",
                "pinCode", "area", "price", "condition", "floor", "features", "contact"
              ]
            }
          }
        };

        const apiKey = "AIzaSyB9A0JzdOYO3vKjTClMG9HbiG4Scc4P77s";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        let extractedData = {};

        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
          const jsonString = result.candidates[0].content.parts[0].text;
          try {
            extractedData = propertyInquirySchema.parse(JSON.parse(jsonString));
            console.log("✅ AI Extracted Data:", extractedData);
          } catch (parseError) {
            console.error("❌ Error parsing AI JSON response or Zod validation failed for AI output:", parseError);
            console.error("Raw AI response:", jsonString);
          }
        } else {
          console.warn("⚠️ Gemini API response structure unexpected or no content:", result);
        }

        if (Object.keys(extractedData).length > 0) {
          await prisma.propertyInquiry.create({
            data: {
              whatsappMessageId: newMessage.whatsappMessageId,
              inquiryDateTime: extractedData.inquiryDateTime ? new Date(extractedData.inquiryDateTime) : null,
              type: extractedData.type,
              transaction: extractedData.transaction,
              bhkConfig: extractedData.bhkConfig,
              address: extractedData.address,
              pinCode: extractedData.pinCode,
              area: extractedData.area,
              price: extractedData.price,
              condition: extractedData.condition,
              floor: extractedData.floor,
              features: extractedData.features,
              contact: extractedData.contact,
            },
          });
          console.log("✅ Property inquiry data successfully saved to Supabase.");
        } else {
          console.log("No structured property inquiry data extracted by AI.");
        }

      } catch (aiError) {
        console.error("❌ Error during AI extraction or saving property inquiry:", aiError);
        console.error("Full AI error details:", JSON.stringify(aiError, Object.getOwnPropertyNames(aiError), 2));
      }
    }

    return new Response("<Response></Response>", {
      status: 200,
      headers: {
        "Content-Type": "text/xml",
      },
    });

  } catch (error) {
    console.error("❌ General error in webhook handler:", error);
    console.error("Full error details:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}