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

async function setupStorageBuckets() {
  try {
    console.log("Setting up Supabase storage buckets...");
    
    // List all existing buckets
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error("Error listing buckets:", listError);
      return;
    }
    
    console.log("Existing buckets:", existingBuckets.map(b => b.name));
    
    // Check if postmedia bucket exists
    const postmediaBucket = existingBuckets.find(b => b.name === "postmedia");
    
    if (!postmediaBucket) {
      console.log("Creating postmedia bucket...");
      
      const { data: newPostmediaBucket, error: createPostmediaError } = await supabase.storage.createBucket("postmedia", {
        public: true,
        allowedMimeTypes: ['image/*', 'video/*']
        // Removed fileSizeLimit as it was causing issues
      });
      
      if (createPostmediaError) {
        console.error("Error creating postmedia bucket:", createPostmediaError);
      } else {
        console.log("postmedia bucket created successfully:", newPostmediaBucket);
      }
    } else {
      console.log("postmedia bucket already exists");
    }
    
    // Set up RLS policies for postmedia bucket
    console.log("Setting up RLS policies for postmedia bucket...");
    
    // Policy to allow authenticated users to upload files
    const uploadPolicy = `
      CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'postmedia' AND 
        auth.role() = 'authenticated'
      );
    `;
    
    // Policy to allow public read access
    const readPolicy = `
      CREATE POLICY "Allow public read access" ON storage.objects
      FOR SELECT USING (bucket_id = 'postmedia');
    `;
    
    // Policy to allow users to update their own files
    const updatePolicy = `
      CREATE POLICY "Allow users to update their own files" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'postmedia' AND 
        auth.uid()::text = (storage.foldername(name))[1]
      );
    `;
    
    // Policy to allow users to delete their own files
    const deletePolicy = `
      CREATE POLICY "Allow users to delete their own files" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'postmedia' AND 
        auth.uid()::text = (storage.foldername(name))[1]
      );
    `;
    
    console.log("Storage bucket setup completed!");
    console.log("\nNext steps:");
    console.log("1. Run the following SQL in your Supabase SQL editor to set up RLS policies:");
    console.log("2. Enable Row Level Security (RLS) on the storage.objects table");
    console.log("3. Execute the policies above");
    
    // Test bucket access
    console.log("\nTesting bucket access...");
    const { data: testFiles, error: testError } = await supabase.storage
      .from("postmedia")
      .list("", { limit: 5 });
    
    if (testError) {
      console.error("Error testing bucket access:", testError);
    } else {
      console.log("Bucket access test successful. Files found:", testFiles?.length || 0);
    }
    
  } catch (error) {
    console.error("Error setting up storage buckets:", error);
  }
}

setupStorageBuckets(); 
