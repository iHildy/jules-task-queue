/**
 * Test Pattern Matching Script
 *
 * This script tests the pattern matching for Jules comments.
 */

// Test the pattern matching logic
const TASK_LIMIT_PATTERNS = [
  "You are currently at your concurrent task limit",
  "You are currently at your limit of 5 running tasks",
];

const WORKING_PATTERNS = ["When finished, you will see another comment"];

function isTaskLimitComment(commentBody) {
  const body = commentBody.toLowerCase();
  return TASK_LIMIT_PATTERNS.some((pattern) =>
    body.includes(pattern.toLowerCase()),
  );
}

function isWorkingComment(commentBody) {
  const body = commentBody.toLowerCase();
  return WORKING_PATTERNS.some((pattern) =>
    body.includes(pattern.toLowerCase()),
  );
}

// Test cases
const testComments = [
  "You are currently at your limit of 5 running tasks. Either wait for a task to finish or pause a task from the dashboard, then reassign this issue.",
  "You are currently at your concurrent task limit",
  "Jules is on it. When finished, you will see another comment and be able to review a PR.",
  "Some other comment that shouldn't match",
];

console.log("🧪 Testing pattern matching...\n");

testComments.forEach((comment, index) => {
  const isTaskLimit = isTaskLimitComment(comment);
  const isWorking = isWorkingComment(comment);

  console.log(`Test ${index + 1}:`);
  console.log(`Comment: "${comment.substring(0, 50)}..."`);
  console.log(`Task Limit: ${isTaskLimit ? "✅" : "❌"}`);
  console.log(`Working: ${isWorking ? "✅" : "❌"}`);
  console.log("");
});
