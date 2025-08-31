// Script to check the current database schema for songs table
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dheairurkxjftugrwdjl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZWFpcnVya3hqZnR1Z3J3ZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyODI3OTEsImV4cCI6MjA3MTg1ODc5MX0.7VSQnn4HdWrMf3qgdPkB2bSyjSH1nuJhH1DR8m4Y4h8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  try {
    console.log('🔍 Checking songs table schema...');
    
    // Get a sample song to see available columns
    const { data: songs, error } = await supabase
      .from('songs')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    if (songs && songs.length > 0) {
      console.log('✅ Sample song record:');
      console.log(JSON.stringify(songs[0], null, 2));
      
      console.log('\n📋 Available columns:');
      Object.keys(songs[0]).forEach(key => {
        console.log(`- ${key}: ${typeof songs[0][key]}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSchema();