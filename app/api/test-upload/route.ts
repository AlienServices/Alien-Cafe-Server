import { createClient } from "@supabase/supabase-js";
import { NextResponse, NextRequest } from 'next/server';

function getSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Server configuration missing Supabase URL or Anon Key' },
        { status: 500 }
      );
    }
    
    console.log("Testing upload...");
    
    // Test 1: List buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    console.log("Available buckets:", buckets?.map(b => b.name));
    
    if (bucketError) {
      console.error("Error listing buckets:", bucketError);
    }
    
    // Test 2: List files in ProfilePhotos bucket
    const { data: files, error: fileError } = await supabase.storage
      .from("ProfilePhotos")
      .list("", { limit: 10 });
    
    console.log("Files in ProfilePhotos:", files);
    
    if (fileError) {
      console.error("Error listing files:", fileError);
    }
    
    // Test 3: List files in postmedia bucket
    console.log("\nTesting postmedia bucket access...");
    const { data: postmediaFiles, error: postmediaError } = await supabase.storage
      .from("postmedia")
      .list("", { limit: 10 });
    
    if (postmediaError) {
      console.error("Error accessing postmedia bucket:", postmediaError);
    } else {
      console.log("Files in postmedia:", postmediaFiles);
    }
    
    // Test 4: Try to upload a test file to postmedia bucket
    console.log("\nTesting postmedia bucket write access...");
    const testContent = "This is a test file for postmedia bucket";
    const testBuffer = Buffer.from(testContent, 'utf8');
    
    const { data: testUploadData, error: testUploadError } = await supabase.storage
      .from("postmedia")
      .upload("test-file.txt", testBuffer, {
        contentType: 'text/plain',
        metadata: {
          test: 'true'
        }
      });
    
    if (testUploadError) {
      console.error("Error uploading test file to postmedia:", testUploadError);
    } else {
      console.log("Test upload successful:", testUploadData);
    }
    
    return NextResponse.json({
      buckets: buckets?.map(b => b.name) || [],
      files: files || [],
      postmediaFiles: postmediaFiles || [],
      testUploadData: testUploadData || null,
      bucketError: bucketError?.message,
      fileError: fileError?.message,
      postmediaError: postmediaError?.message,
      testUploadError: testUploadError?.message
    });
    
  } catch (error) {
    console.error("Test upload error:", error);
    return NextResponse.json({ error: "Test failed" }, { status: 500 });
  }
} 