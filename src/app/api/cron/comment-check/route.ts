import { NextResponse } from 'next/server';
import { executeCommentCheck } from '@/lib/webhook-processor';

export async function POST(request: Request) {
  try {
    const { owner, repo, issueNumber, taskId } = await request.json();

    if (!owner || !repo || !issueNumber || !taskId) {
      return NextResponse.json({ message: 'Missing required parameters' }, { status: 400 });
    }

    await executeCommentCheck(owner, repo, issueNumber, taskId);

    return NextResponse.json({ message: 'Comment check executed successfully' });
  } catch (error) {
    console.error('Error executing comment check:', error);
    return NextResponse.json({ message: 'Error executing comment check' }, { status: 500 });
  }
}
