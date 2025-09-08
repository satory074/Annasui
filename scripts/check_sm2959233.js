// Script to check sm2959233 medley data in detail
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dheairurkxjftugrwdjl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZWFpcnVya3hqZnR1Z3J3ZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyODI3OTEsImV4cCI6MjA3MTg1ODc5MX0.7VSQnn4HdWrMf3qgdPkB2bSyjSH1nuJhH1DR8m4Y4h8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSm2959233() {
  try {
    console.log('🔍 Checking sm2959233 detailed data...');
    
    // Get the medley
    const { data: medleys, error: medleyError } = await supabase
      .from('medleys')
      .select('*')
      .eq('video_id', 'sm2959233')
      .single();

    if (medleyError) {
      console.error('❌ Error fetching medley:', medleyError);
      return;
    }

    if (!medleys) {
      console.log('❌ No medley found for sm2959233');
      return;
    }

    console.log('✅ Medley found:');
    console.log(JSON.stringify(medleys, null, 2));
    
    // Get the songs for this medley
    const { data: songs, error: songsError } = await supabase
      .from('songs')
      .select('*')
      .eq('medley_id', medleys.id)
      .order('order_index', { ascending: true });

    if (songsError) {
      console.error('❌ Error fetching songs:', songsError);
      return;
    }

    console.log(`\n🎵 Songs (${songs?.length || 0}):`);
    if (songs && songs.length > 0) {
      for (const song of songs) {
        console.log(`\n${song.order_index}. ${song.title}`);
        console.log(`   Artist: ${song.artist || 'Unknown'}`);
        console.log(`   Time: ${song.start_time}s - ${song.end_time}s`);
        console.log(`   Duration: ${song.end_time - song.start_time}s`);
        console.log(`   Color: ${song.color || 'None'}`);
        console.log(`   Original Link: ${song.original_link || 'None'}`);
      }
    } else {
      console.log('No songs found');
    }

    // Test API call like the app would do
    console.log('\n🔧 Testing API call simulation...');
    const response = await fetch(`https://dheairurkxjftugrwdjl.supabase.co/rest/v1/medleys?select=*&video_id=eq.sm2959233`, {
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ API call failed: ${response.status} ${response.statusText}`);
    } else {
      const data = await response.json();
      console.log('✅ Direct API call successful:', data.length, 'record(s)');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSm2959233();