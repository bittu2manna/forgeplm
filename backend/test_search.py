import unittest

from backend.search import Principal, bounded_snippet, can_read, local_embedding


class SearchSecurityTests(unittest.TestCase):
    def test_restricted_record_is_not_readable_without_matching_group(self):
        self.assertFalse(can_read(Principal("alex", ("engineering",)), ("procurement-restricted",)))

    def test_embedding_is_normalized_and_local(self):
        vector = local_embedding("battery enclosure venting")
        self.assertEqual(len(vector), 96)
        self.assertAlmostEqual(sum(v * v for v in vector), 1, places=5)

    def test_snippets_are_bounded(self):
        self.assertEqual(len(bounded_snippet("x" * 500)), 360)


if __name__ == "__main__":
    unittest.main()
