// Script to add individual links to songs for thumbnail testing
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dheairurkxjftugrwdjl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZWFpcnVya3hqZnR1Z3J3ZGpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyODI3OTEsImV4cCI6MjA3MTg1ODc5MX0.7VSQnn4HdWrMf3qgdPkB2bSyjSH1nuJhH1DR8m4Y4h8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addIndividualLinks() {
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

    // Update 千本桜 with individual links
    console.log('🔄 Updating 千本桜...');
    const { data: senbonzakura, error: senbonzakuraError } = await supabase
      .from('songs')
      .update({
        links: JSON.stringify({
          niconico: "https://www.nicovideo.jp/watch/sm15630734",
          youtube: "https://www.youtube.com/watch?v=K_xTet06SUo"
        })
      })
      .eq('medley_id', medleyId)
      .eq('title', '千本桜')
      .select();

    if (senbonzakuraError) {
      console.error('❌ Error updating 千本桜:', senbonzakuraError);
    } else {
      console.log('✅ Updated 千本桜:', senbonzakura);
    }

    // Update マトリョシカ with individual links
    console.log('🔄 Updating マトリョシカ...');
    const { data: matryoshka, error: matryoshkaError } = await supabase
      .from('songs')
      .update({
        links: JSON.stringify({
          niconico: "https://www.nicovideo.jp/watch/sm11809611",
          youtube: "https://www.youtube.com/watch?v=HOz-9FzIDf0"
        })
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
    console.log('🔍 Verifying updates...');
    const { data: updatedSongs, error: verifyError } = await supabase
      .from('songs')
      .select('title, artist, links, original_link')
      .eq('medley_id', medleyId)
      .not('links', 'is', null)
      .order('order_index');

    if (verifyError) {
      console.error('❌ Error verifying updates:', verifyError);
    } else {
      console.log('✅ Songs with individual links:');
      updatedSongs.forEach(song => {
        console.log(`- ${song.title} by ${song.artist}`);
        console.log(`  Links: ${song.links}`);
        console.log(`  Original: ${song.original_link}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addIndividualLinks();