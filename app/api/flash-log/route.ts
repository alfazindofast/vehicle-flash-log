import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('flash_log_data')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine for first load
      throw error;
    }

    // Return stored data (no defaults - vehicles should be loaded from Supabase)
    const responseData = data || {
      records: [],
      used: [],
      vehicles: []
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { records, used, vehicles } = await request.json();

    // Validate data
    if (!Array.isArray(records) || !Array.isArray(used)) {
      return NextResponse.json(
        { error: 'Invalid data format: records and used must be arrays' },
        { status: 400 }
      );
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

    return NextResponse.json({
      success: true,
      message: 'Data saved successfully',
      recordCount: records.length,
      usedCount: used.length
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
