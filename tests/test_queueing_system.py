import unittest
from queueing_system.queueing_system import QueueingSystem, Customer

class TestQueueingSystem(unittest.TestCase):
    def test_simulation_run(self):
        qs = QueueingSystem(
            num_tellers=2,
            simulation_time=10,
            arrival_rate=0.5,
            service_rate=0.5
        )
        qs.run_simulation()
        self.assertLessEqual(qs.total_customers_served, 10)

    def test_issue_queuing_and_retry(self):
        qs = QueueingSystem(
            num_tellers=1,
            simulation_time=5,
            arrival_rate=10,  # High arrival rate to ensure queueing
            service_rate=0.1, # Low service rate to ensure queueing
            max_retries=1
        )
        qs.run_simulation()
        # Check if there were retries and customers were served
        self.assertGreater(qs.total_customers_served, 0)
        self.assertGreater(qs.total_retries, 0)

if __name__ == '__main__':
    unittest.main()
