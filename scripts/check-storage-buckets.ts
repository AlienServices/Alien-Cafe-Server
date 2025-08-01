import { createClient } from "@supabase/supabase-js";
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase URL or Anon Key in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAndCreateBuckets() {
  try {
    console.log("Checking available storage buckets...");
    
    // List all buckets
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Error listing buckets:", error);
      return;
    }
    
    console.log("Available buckets:", buckets.map(b => b.name));
    
    // Check if postmedia bucket exists
    const postMediaBucket = buckets.find(b => b.name === "postmedia");
    
    if (!postMediaBucket) {
      console.log("postmedia bucket not found. Creating it...");
      
      const { data: newBucket, error: createError } = await supabase.storage.createBucket("postmedia", {
        public: true,
        allowedMimeTypes: ['image/*', 'video/*']
      });
      
      if (createError) {
        console.error("Error creating postmedia bucket:", createError);
      } else {
        console.log("postmedia bucket created successfully:", newBucket);
      }
    } else {
      console.log("postmedia bucket already exists");
    }
    
    // List files in postmedia bucket if it exists
    if (postMediaBucket) {
      console.log("\nListing files in postmedia bucket:");
      const { data: files, error: listError } = await supabase.storage
        .from("postmedia")
        .list();
      
      if (listError) {
        console.error("Error listing postmedia files:", listError);
      } else {
        console.log("Files in postmedia:", files);
      }
    }
    
  } catch (error) {
    console.error("Error checking buckets:", error);
  }
}

checkAndCreateBuckets(); 