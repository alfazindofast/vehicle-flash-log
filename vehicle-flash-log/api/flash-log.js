// Vercel Serverless Function: /api/flash-log.js
// This file handles GET and POST requests to store/retrieve flash log data

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// These environment variables are set in Vercel dashboard
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET: Retrieve flash log data
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('flash_log_data')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine for first load
        throw error;
      }

      // Return stored data or defaults
      const responseData = data || {
        records: [],
        used: [],
        vehicles: [
          "P6EBE1ATD24000002","P6EBE1FYH24000153","P6EBE1FYH24000166",
          "P6EBE1FYH24000179","P6EBE1FYH24000190","P6EBE1FYH24000158",
          "P6EBE1FYH24000191","P6EBE1FYH24000159","P6EBE1FYH24000198",
          "P6EBE1FYH24000183","P6EBE1FYH24000160","P6EBE1FYH24000169",
          "P6EBE1FYH24000194","P6EBE1FYH24000195","P6EBE1FYH24000167",
          "P6EBE1FYH24000161","P6EBE1FYH24000177","P6EBE1FYH24000156",
          "P6EBE1FYH24000186","P6EBE1FYH24000189"
        ]
      };

      return res.status(200).json(responseData);
    }

    // POST: Save flash log data
    if (req.method === 'POST') {
      const { records, used, vehicles } = req.body;

      // Validate data
      if (!Array.isArray(records) || !Array.isArray(used)) {
        return res.status(400).json({ 
          error: 'Invalid data format: records and used must be arrays' 
        });
      }

      // Check if record exists
      const { data: existingData } = await supabase
        .from('flash_log_data')
        .select('id')
        .single();

      let result;
      if (existingData) {
        // Update existing record
        result = await supabase
          .from('flash_log_data')
          .update({ records, used, vehicles, updated_at: new Date().toISOString() })
          .eq('id', existingData.id);
      } else {
        // Insert new record
        result = await supabase
          .from('flash_log_data')
          .insert([{ records, used, vehicles }]);
      }

      if (result.error) {
        throw result.error;
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Data saved successfully',
        recordCount: records.length,
        usedCount: used.length
      });
    }

    // Method not allowed
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}
