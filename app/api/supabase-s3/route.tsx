import { createClient } from "@supabase/supabase-js";
import { encode } from "blurhash";
import sharp from "sharp";// pages/api/upload.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient()

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase URL or Anon Key in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { NextResponse, NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    const requestData = await req.formData();
    const file = requestData.get("image");
    //@ts-ignore
    console.log({...file}, "this is the image");

    if (!file || !(file instanceof Blob)) {
      console.error("File is not found or not of type Blob");
      return NextResponse.json(
        { error: "File not found or invalid type" },
        { status: 400 }
      );
    }

    console.log('i hit past type guard')

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    try {
      const buf = await sharp(buffer)
        .resize(64, 64)
        .ensureAlpha()
        .raw()
        .toBuffer();
      const blurhash = encode(Uint8ClampedArray.from(buf), 64, 64, 4, 4);
      console.log(blurhash, 'this is the blurhash');
      if(!id) throw new Error('no user')
      await prisma.user.update({
        where: { id },
        data: {
          blurhash
        }
      })
    } catch (err) {
      console.error(err)
    }

    const { data, error } = await supabase.storage
      .from("ProfilePhotos")
      .upload(file.name, file, {
        upsert: true,
        contentType: file.type,
      });

    if (error) {
      console.error("Upload error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { message: "Upload successful", data },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
