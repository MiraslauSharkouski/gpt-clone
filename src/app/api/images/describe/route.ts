import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

/**
 * POST /api/images/describe
 * Describe an image using Qwen-VL or OCR fallback
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();

    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Validate image type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        { error: 'Image must be JPEG, PNG, GIF, or WebP' },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `${user.id}/${Date.now()}-${image.name}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, buffer, {
        contentType: image.type,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('images')
      .getPublicUrl(fileName);

    // Call Qwen-VL API for image description
    const apiKey = process.env.QWEN_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Qwen API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen-vl-plus',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: publicUrl } },
            { type: 'text', text: 'Describe this image in detail.' },
          ],
        }],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      // Fallback: just return the URL
      return NextResponse.json({
        description: 'Image uploaded successfully. Unable to process image content.',
        url: publicUrl,
      });
    }

    const data = await response.json();
    const description = data.choices?.[0]?.message?.content || 'Unable to describe image.';

    return NextResponse.json({
      description,
      url: publicUrl,
    });
  } catch (error) {
    console.error('Image describe error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
