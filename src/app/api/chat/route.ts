import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || '');

export async function POST(req: Request) {
  if (!process.env.GOOGLE_API_KEY) {
    return NextResponse.json(
      { error: 'Google API key not configured' },
      { status: 500 }
    );
  }

  try {
    const { messages, courseId } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages provided' },
        { status: 400 }
      );
    }

    // Initialize the model with proper configuration
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
        topP: 0.8,
        topK: 40,
      }
    });

    // Create the system message
    const systemMessage = `You are a helpful AI course instructor assistant for course ${courseId}. 
                          Your goal is to help students understand the course material and answer their questions.
                          If context from course files is provided, use it to give more specific and accurate answers.
                          If no context is provided, give general guidance based on the topic.
                          Always be encouraging and supportive, while maintaining academic integrity.`;

    // Build the conversation history
    let conversationHistory = systemMessage + "\n\n";
    
    // Add previous messages to the conversation
    messages.forEach((msg, index) => {
      if (msg.role === 'user') {
        conversationHistory += `User: ${msg.content}\n`;
      } else if (msg.role === 'assistant') {
        conversationHistory += `Assistant: ${msg.content}\n`;
      }
    });

    // Generate content with the full conversation history
    const result = await model.generateContent(conversationHistory);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({
      message: text
    });
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 }
    );
  }
} 