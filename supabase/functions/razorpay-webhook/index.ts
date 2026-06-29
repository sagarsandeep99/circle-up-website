// ==========================================================================
// Supabase Edge Function: razorpay-webhook/index.ts
// ==========================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Helper function to verify that the message actually came from Razorpay's servers
async function verifyRazorpaySignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const bodyData = encoder.encode(rawBody)
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, bodyData)
  
  const hashArray = Array.from(new Uint8Array(signatureBuffer))
  const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return expectedSignature === signature
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const signature = req.headers.get('x-razorpay-signature') || ''
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || ''
    
    // Read the absolute raw body string (Crucial for correct cryptographic hashing)
    const rawBody = await req.text()

    // Validate webhook signature authenticity
    const isGenuine = await verifyRazorpaySignature(rawBody, signature, webhookSecret)
    if (!isGenuine) {
      return new Response(JSON.stringify({ error: 'Signature verification mismatch.' }), { status: 401 })
    }

    const payload = JSON.parse(rawBody)
    const eventType = payload.event

    // We trigger registration on payment.captured or order.paid
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const payment = payload.payload.payment.entity
      
      // Extract properties passed down through your checkout scripts
      const razorpayPaymentId = payment.id
      const razorpayOrderId = payment.order_id
      const email = payment.email
      const contact = payment.contact
      
      // Extract specific custom items passed via the options.notes array
      const ticketKey = payment.notes?.ticket_sku
      const attendeeName = payment.notes?.chosen_ticket ? payment.notes.chosen_ticket.split('x ')[1] || 'CircleUp Attendee' : 'CircleUp Attendee'

      // Connect securely to your PostgreSQL database instance
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
      const supabase = createClient(supabaseUrl, supabaseAnonKey)

      // Run your safe SQL registration procedure
      const { data: isSuccess, error: rpcError } = await supabase.rpc('process_secure_registration', {
        target_ticket_key: ticketKey,
        p_name: attendeeName,
        p_email: email,
        p_phone: contact,
        p_razorpay_id: razorpayPaymentId,
        p_order_id: razorpayOrderId
      })

      if (rpcError) {
        // Handle gracefully if the frontend code already beat the webhook to the database record
        if (rpcError.message.includes('unique') || rpcError.code === '23505') {
          return new Response(JSON.stringify({ message: 'Registration already finalized by frontend.' }), { status: 200 })
        }
        throw rpcError
      }
    }

    return new Response(JSON.stringify({ status: 'success' }), { status: 200 })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})