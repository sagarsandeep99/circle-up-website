// ==========================================================================
// Supabase Edge Function: create-razorpay-order/index.ts
// ==========================================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle preflight browser configurations
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { ticket_key } = await req.json()

    if (!ticket_key) {
      return new Response(JSON.stringify({ error: 'Missing ticket parameter.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize internal Supabase client using environment configurations
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Pull the TRUE price and availability metrics straight out of your SQL tables
    const { data: inventoryItem, error: dbError } = await supabase
      .from('ticket_inventory')
      .select('price, available_count')
      .eq('ticket_key', ticket_key)
      .single()

    if (dbError || !inventoryItem) {
      return new Response(JSON.stringify({ error: 'Ticket category not found.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (inventoryItem.available_count <= 0) {
      return new Response(JSON.stringify({ error: 'This ticket class is sold out.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Grab secret credentials stored safely in your environment settings
    const rzpKeyId = Deno.env.get('RAZORPAY_KEY_ID') || ''
    const rzpKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') || ''
    const amountInPaise = inventoryItem.price * 100

    // Communicate privately server-to-server with Razorpay
    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(`${rzpKeyId}:${rzpKeySecret}`)}`
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`
      })
    })

    const orderData = await rzpResponse.json()

    if (!rzpResponse.ok) {
      throw new Error(orderData.error?.description || 'Failed generating order parameters.')
    }

    // Return the secure, locked order identification string back to the browser
    return new Response(JSON.stringify({ order_id: orderData.id, amount: amountInPaise }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})