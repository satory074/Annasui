// Script to check existing medleys in the database
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dheairurkxjftugrwdjl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZWFpcnVya3hqZnR1Z3J3ZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyODI3OTEsImV4cCI6MjA3MTg1ODc5MX0.7VSQnn4HdWrMf3qgdPkB2bSyjSH1nuJhH1DR8m4Y4h8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkMedleys() {
  try {
    console.log('🔍 Checking existing medleys...');
    
    // Get all medleys
    const { data: medleys, error } = await supabase
      .from('medleys')
      .select('id, video_id, title, creator, duration')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    if (medleys && medleys.length > 0) {
      console.log(`✅ Found ${medleys.length} medleys:`);
      
      for (const medley of medleys) {
        console.log(`\n📹 Video ID: ${medley.video_id}`);
        console.log(`   Title: ${medley.title}`);
        console.log(`   Creator: ${medley.creator || 'Unknown'}`);
        console.log(`   Duration: ${medley.duration}s`);
        console.log(`   Database ID: ${medley.id}`);
        
        // Check for songs count
        const { data: songs, error: songsError } = await supabase
          .from('songs')
          .select('id')
          .eq('medley_id', medley.id);
          
        if (!songsError && songs) {
          console.log(`   Songs: ${songs.length} song(s)`);
        }
      }
      
      // Check specifically for sm2959233
      console.log('\n🔍 Checking specifically for sm2959233...');
      const ryuuseiGun = medleys.find(m => m.video_id === 'sm2959233');
      if (ryuuseiGun) {
        console.log('✅ sm2959233 (ニコニコ動画流星群) found in database!');
      } else {
        console.log('❌ sm2959233 (ニコニコ動画流星群) NOT found in database');
      }
      
    } else {
      console.log('❌ No medleys found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkMedleys();