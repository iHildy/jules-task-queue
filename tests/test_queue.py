import unittest
from unittest.mock import patch, MagicMock
from src.lib import jules, github

class TestQueue(unittest.TestCase):
    @patch('src.lib.github.add_label')
    @patch('src.lib.github.remove_label')
    @patch('src.lib.jules.get_jules_tasks')
    def test_queueing_system(self, mock_get_jules_tasks, mock_remove_label, mock_add_label):
        # Mock that Jules is at its concurrent task limit
        mock_get_jules_tasks.return_value = {'items': [MagicMock()] * 5}

        # Create a new issue and add the "jules" label to it
        issue = MagicMock()
        issue.number = 123
        issue.labels = [{'name': 'jules'}]

        # Process the issue
        jules.process_issue(issue)

        # Verify that the system adds the "jules-queue" label to the issue and removes the "jules" label
        mock_add_label.assert_called_once_with(issue.number, 'jules-queue')
        mock_remove_label.assert_called_once_with(issue.number, 'jules')

        # Mock the cron job that retries the queued tasks
        mock_get_jules_tasks.return_value = {'items': []}
        jules.retry_queued_tasks()

        # Verify that the system removes the "jules-queue" label and adds the "jules" label back
        mock_remove_label.assert_called_with(issue.number, 'jules-queue')
        mock_add_label.assert_called_with(issue.number, 'jules')

if __name__ == '__main__':
    unittest.main()
