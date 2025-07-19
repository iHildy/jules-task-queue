---
alwaysApply: false
---
Please read the [README.md](https://README.md) file to understand the purpose of this project. Your goal to to fully test it with real actions.

Required context: The GitHub app and repository have already been linked and setup via the USER from the web app.

Unless prompted to skip TEST_1 continue and perform it.

TEST_1:

I want you to leverage the GitHub CLI to fully test the process. This includes using it to create a TEST issue in the GitHub repository, and then assign it the `jules` label, then sleep for 10s and check if the Jules bot has replied in the issue comments, also check if our system automatically reacted to it with an emoji. If that was successful please remove the issue entirely. If it failed at any part please remove the the issue entirely as well to avoid leaving unnecessary issues in the GitHub (use the --yes flag to avoid confirmation prompts), then proceed to investigate any issues you ran into with the codebase and use your context to fix them. Use the `gh issue view <issue-number> --comments > output.txt 2>&1` and then `cat output.txt` command to view the issue and comments.

If TEST_1 was fully successful (or you were instructed to skip it) then proceed to perform TEST_2

TEST_2:

We now are to test the queueing system - an extremely crucial part of this project. You need to use the GitHub CLI again to create 5 issues for testing on ONE command (either via && or a native way) that each have the `jules` label, immediately after create 5 more issues in ONE command with the same label. Immediately after check the status of ALL 10 issues in ONE command checking for things like the `jules-queue` label and comments saying the limit was reached by the Jules bot. Then query our database to check that all data was stored correctly and everything is queued correctly. Then use our ‘cron:run’ command in package.json to run the cron job, after which check all 10 issues again and the database for expected behavior. Then prompt the USER to login to Jules web app ([jules.google](https://jules.google)) and make sure to end all currently running - in order to provide them sufficient time to do this use the terminal tool to request to run this command exactly: echo “Run this once the 5 concurrent task limit is negated and there are 0 tasks running in Jules”. If that is the case then run the ‘cron:run’ command once more and then check the statuses of all issues in one command, its expected that the previous 5 that were queued have now only the `jules` tag and the Jules GitHub bot has commented it started. In that case of a fully successful test delete all the test GitHub issues in one command to not cause issue bloat. Then return the status to the user the test was successful, prompt the user to delete their tasks in Jules.

If at any point during any test an unexpected behavior happens investigate in the code and fix the issue based on your knowledge as an expert SWE