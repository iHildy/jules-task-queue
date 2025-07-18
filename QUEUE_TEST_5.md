# QUEUE_TEST_5: Test Cron Job

This test case verifies that the cron job correctly retries tasks that have been flagged for retry.

## Steps

1.  Create a new task in the database.
2.  Flag the task for retry.
3.  Manually trigger the cron job.
4.  Verify that the task has been retried.
5.  Clean up the test data.
