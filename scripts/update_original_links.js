// Script to update original_link for specific songs to test individual thumbnails
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dheairurkxjftugrwdjl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZWFpcnVya3hqZnR1Z3J3ZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyODI3OTEsImV4cCI6MjA3MTg1ODc5MX0.7VSQnn4HdWrMf3qgdPkB2bSyjSH1nuJhH1DR8m4Y4h8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateOriginalLinks() {
  try {
    console.log('🔍 Finding ボカロメドレー2025...');
    
    // Get the medley ID for ボカロメドレー2025
    const { data: medleys, error: medleyError } = await supabase
      .from('medleys')
      .select('id, title')
      .eq('video_id', 'sm38343669')
      .eq('title', 'ボカロメドレー2025');

    if (medleyError) {
      throw medleyError;
    }

    if (!medleys || medleys.length === 0) {
      console.log('❌ Medley not found');
      return;
    }

    const medleyId = medleys[0].id;
    console.log('✅ Found medley ID:', medleyId);

    // First, let's see what songs are in this medley
    console.log('🔍 Listing all songs in the medley...');
    const { data: allSongs, error: listError } = await supabase
      .from('songs')
      .select('title, artist, original_link, order_index')
      .eq('medley_id', medleyId)
      .order('order_index');

    if (listError) {
      throw listError;
    }

    console.log('📋 Songs in ボカロメドレー2025:');
    allSongs.forEach(song => {
      console.log(`${song.order_index}. ${song.title} - ${song.artist}`);
      console.log(`   Link: ${song.original_link}`);
    });

    // Update 千本桜 with individual Niconico link
    console.log('\n🔄 Updating 千本桜 original_link...');
    const { data: senbonzakura, error: senbonzakuraError } = await supabase
      .from('songs')
      .update({
        original_link: "https://www.nicovideo.jp/watch/sm15630734"
      })
      .eq('medley_id', medleyId)
      .eq('title', '千本桜')
      .select();

    if (senbonzakuraError) {
      console.error('❌ Error updating 千本桜:', senbonzakuraError);
    } else {
      console.log('✅ Updated 千本桜:', senbonzakura);
    }

    // Update マトリョシカ with individual YouTube link
    console.log('\n🔄 Updating マトリョシカ original_link...');
    const { data: matryoshka, error: matryoshkaError } = await supabase
      .from('songs')
      .update({
        original_link: "https://www.youtube.com/watch?v=HOz-9FzIDf0"
      })
      .eq('medley_id', medleyId)
      .eq('title', 'マトリョシカ')
      .select();

    if (matryoshkaError) {
      console.error('❌ Error updating マトリョシカ:', matryoshkaError);
    } else {
      console.log('✅ Updated マトリョシカ:', matryoshka);
    }

    // Verify the updates
    console.log('\n🔍 Verifying updates...');
    const { data: updatedSongs, error: verifyError } = await supabase
      .from('songs')
      .select('title, artist, original_link, order_index')
      .eq('medley_id', medleyId)
      .in('title', ['千本桜', 'マトリョシカ'])
      .order('order_index');

    if (verifyError) {
      console.error('❌ Error verifying updates:', verifyError);
    } else {
      console.log('✅ Updated songs:');
      updatedSongs.forEach(song => {
        console.log(`${song.order_index}. ${song.title} by ${song.artist}`);
        console.log(`   Updated Link: ${song.original_link}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

updateOriginalLinks();