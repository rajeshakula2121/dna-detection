"""
Aho-Corasick Multi-Pattern String Matching Automaton
Enables simultaneous scanning of multiple motifs across a DNA sequence
in linear time proportional to sequence length plus total match count.
"""

from collections import deque
from typing import List, Dict, Any, Set
from .validation import clean_sequence, reverse_complement


class AhoCorasickNode:
    """A single state in the Aho-Corasick Trie automaton."""
    def __init__(self, state_id: int):
        self.state_id = state_id
        self.transitions: Dict[str, AhoCorasickNode] = {}
        self.fail: 'AhoCorasickNode' = None  # type: ignore
        self.output: List[str] = []          # Patterns ending at this state


class AhoCorasickAutomaton:
    """Trie-based Finite State Automaton with failure and dictionary links."""
    def __init__(self, patterns: List[str]):
        self.root = AhoCorasickNode(0)
        self.next_state_id = 1
        self.patterns = [clean_sequence(p) for p in patterns if clean_sequence(p)]
        self._build_trie()
        self._build_failure_links()

    def _build_trie(self) -> None:
        """Inserts all patterns into the trie structure."""
        for pattern in self.patterns:
            current = self.root
            for char in pattern:
                if char not in current.transitions:
                    current.transitions[char] = AhoCorasickNode(self.next_state_id)
                    self.next_state_id += 1
                current = current.transitions[char]
            current.output.append(pattern)

    def _build_failure_links(self) -> None:
        """Computes failure transitions and output links via Breadth-First Search."""
        queue: deque[AhoCorasickNode] = deque()

        # Direct children of root fail back to root
        for char, child in self.root.transitions.items():
            child.fail = self.root
            queue.append(child)

        self.root.fail = self.root

        # BFS for deeper nodes
        while queue:
            current = queue.popleft()

            for char, next_node in current.transitions.items():
                fail_node = current.fail
                while fail_node != self.root and char not in fail_node.transitions:
                    fail_node = fail_node.fail

                if char in fail_node.transitions and fail_node.transitions[char] != next_node:
                    next_node.fail = fail_node.transitions[char]
                else:
                    next_node.fail = self.root

                # Merge output matches from failure link
                next_node.output.extend(next_node.fail.output)
                queue.append(next_node)

    def search(self, sequence: str, include_reverse_complement: bool = False) -> List[Dict[str, Any]]:
        """
        Scans a sequence and returns all occurrences of all patterns.
        1-based biological coordinates.
        """
        seq = clean_sequence(sequence)
        if not seq:
            return []

        results: List[Dict[str, Any]] = []

        # Forward scan
        current = self.root
        for idx, char in enumerate(seq):
            while current != self.root and char not in current.transitions:
                current = current.fail

            current = current.transitions.get(char, self.root)

            for pattern in current.output:
                m_len = len(pattern)
                start_pos = idx - m_len + 2  # 1-based coordinate
                end_pos = idx + 1            # 1-based inclusive
                results.append({
                    "pattern": pattern,
                    "start": start_pos,
                    "end": end_pos,
                    "length": m_len,
                    "strand": "+",
                    "matched_sequence": seq[start_pos - 1:end_pos]
                })

        # Reverse complement scan if requested
        if include_reverse_complement:
            rc_patterns = [reverse_complement(p) for p in self.patterns]
            rc_automaton = AhoCorasickAutomaton(rc_patterns)
            rc_results = rc_automaton.search(seq, include_reverse_complement=False)
            
            # Map back to original pattern names
            orig_by_rc = {reverse_complement(p): p for p in self.patterns}
            for match in rc_results:
                match["strand"] = "-"
                match["rc_pattern"] = match["pattern"]
                match["pattern"] = orig_by_rc.get(match["pattern"], match["pattern"])
                results.append(match)

        # Sort matches by start position
        results.sort(key=lambda x: (x["start"], x["pattern"]))
        return results


def multi_pattern_search(
    sequence: str, 
    patterns: List[str], 
    include_reverse_complement: bool = False
) -> Dict[str, Any]:
    """
    Convenience wrapper for Aho-Corasick multi-pattern search.
    Returns:
        total_matches: int
        unique_patterns_found: int
        pattern_counts: Dict[str, int]
        matches: List[Dict[str, Any]]
    """
    cleaned_patterns = [clean_sequence(p) for p in patterns if clean_sequence(p)]
    if not cleaned_patterns:
        return {
            "total_matches": 0,
            "unique_patterns_found": 0,
            "pattern_counts": {},
            "matches": []
        }

    automaton = AhoCorasickAutomaton(cleaned_patterns)
    matches = automaton.search(sequence, include_reverse_complement=include_reverse_complement)

    counts: Dict[str, int] = {}
    for m in matches:
        p = m["pattern"]
        counts[p] = counts.get(p, 0) + 1

    return {
        "total_matches": len(matches),
        "unique_patterns_found": len(counts),
        "pattern_counts": counts,
        "matches": matches
    }


def aho_corasick_search(sequence: str, patterns: List[str]) -> Dict[str, Any]:
    """
    Search sequence for multiple patterns and return structured format for API and tests.
    """
    clean_seq = clean_sequence(sequence)
    res = multi_pattern_search(clean_seq, patterns)
    
    matches_by_pattern: Dict[str, List[Dict[str, Any]]] = {p: [] for p in patterns}
    chrono_matches: List[Dict[str, Any]] = []
    
    for m in res["matches"]:
        p = m["pattern"]
        item = {
            "pattern": p,
            "startPos": m["start"],
            "endPos": m["end"],
            "matchedSubsequence": m.get("matched_sequence", "")
        }
        if p in matches_by_pattern:
            matches_by_pattern[p].append(item)
        chrono_matches.append(item)
        
    return {
        "sequenceLength": len(clean_seq),
        "totalPatternsSearched": len(patterns),
        "totalMatchesFound": res["total_matches"],
        "matchesByPattern": matches_by_pattern,
        "allMatchesChronological": chrono_matches
    }

