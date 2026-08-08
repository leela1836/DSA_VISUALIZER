/* ══════════════════════════════════════════════════════════════════════
   LeetCode problems, mapped onto the roadmap topics.
   Each entry: [number, title, difficulty, slug, lists]
     difficulty — E / M / H
     lists      — B = Blind 75, N = NeetCode 150, BN = both
   Ordered easiest-first inside each topic, so you can walk straight down.
   ══════════════════════════════════════════════════════════════════════ */
const LC = {

/* ── Phase 0 ── */
't-builtin': [
  [1,   'Two Sum',                         'E', 'two-sum', 'BN'],
  [217, 'Contains Duplicate',              'E', 'contains-duplicate', 'BN'],
  [242, 'Valid Anagram',                   'E', 'valid-anagram', 'BN']
],

/* ── Phase 1 ── */
't-array': [
  [217, 'Contains Duplicate',              'E', 'contains-duplicate', 'BN'],
  [121, 'Best Time to Buy and Sell Stock', 'E', 'best-time-to-buy-and-sell-stock', 'BN'],
  [53,  'Maximum Subarray',                'M', 'maximum-subarray', 'BN'],
  [238, 'Product of Array Except Self',    'M', 'product-of-array-except-self', 'BN'],
  [48,  'Rotate Image',                    'M', 'rotate-image', 'N'],
  [54,  'Spiral Matrix',                   'M', 'spiral-matrix', 'N']
],
't-hash': [
  [242, 'Valid Anagram',                   'E', 'valid-anagram', 'BN'],
  [1,   'Two Sum',                         'E', 'two-sum', 'BN'],
  [49,  'Group Anagrams',                  'M', 'group-anagrams', 'BN'],
  [347, 'Top K Frequent Elements',         'M', 'top-k-frequent-elements', 'BN'],
  [36,  'Valid Sudoku',                    'M', 'valid-sudoku', 'N'],
  [128, 'Longest Consecutive Sequence',    'M', 'longest-consecutive-sequence', 'BN']
],
't-2ptr': [
  [125, 'Valid Palindrome',                'E', 'valid-palindrome', 'N'],
  [167, 'Two Sum II',                      'M', 'two-sum-ii-input-array-is-sorted', 'N'],
  [11,  'Container With Most Water',       'M', 'container-with-most-water', 'BN'],
  [15,  '3Sum',                            'M', '3sum', 'BN'],
  [42,  'Trapping Rain Water',             'H', 'trapping-rain-water', 'N']
],
't-window': [
  [121, 'Best Time to Buy and Sell Stock', 'E', 'best-time-to-buy-and-sell-stock', 'BN'],
  [3,   'Longest Substring Without Repeating Characters', 'M', 'longest-substring-without-repeating-characters', 'BN'],
  [424, 'Longest Repeating Character Replacement', 'M', 'longest-repeating-character-replacement', 'BN'],
  [567, 'Permutation in String',           'M', 'permutation-in-string', 'N'],
  [76,  'Minimum Window Substring',        'H', 'minimum-window-substring', 'BN'],
  [239, 'Sliding Window Maximum',          'H', 'sliding-window-maximum', 'N']
],
't-prefix': [
  [303, 'Range Sum Query — Immutable',     'E', 'range-sum-query-immutable', ''],
  [238, 'Product of Array Except Self',    'M', 'product-of-array-except-self', 'BN'],
  [560, 'Subarray Sum Equals K',           'M', 'subarray-sum-equals-k', ''],
  [152, 'Maximum Product Subarray',        'M', 'maximum-product-subarray', 'BN']
],

/* ── Phase 2 ── */
't-sort': [
  [912, 'Sort an Array',                   'M', 'sort-an-array', ''],
  [75,  'Sort Colors',                     'M', 'sort-colors', ''],
  [56,  'Merge Intervals',                 'M', 'merge-intervals', 'BN'],
  [215, 'Kth Largest Element in an Array', 'M', 'kth-largest-element-in-an-array', 'N'],
  [148, 'Sort List',                       'M', 'sort-list', '']
],
't-bsearch': [
  [704, 'Binary Search',                   'E', 'binary-search', 'N'],
  [74,  'Search a 2D Matrix',              'M', 'search-a-2d-matrix', 'N'],
  [153, 'Find Minimum in Rotated Sorted Array', 'M', 'find-minimum-in-rotated-sorted-array', 'BN'],
  [33,  'Search in Rotated Sorted Array',  'M', 'search-in-rotated-sorted-array', 'BN'],
  [875, 'Koko Eating Bananas',             'M', 'koko-eating-bananas', 'N'],
  [4,   'Median of Two Sorted Arrays',     'H', 'median-of-two-sorted-arrays', 'N']
],

/* ── Phase 3 ── */
't-ll': [
  [206, 'Reverse Linked List',             'E', 'reverse-linked-list', 'BN'],
  [21,  'Merge Two Sorted Lists',          'E', 'merge-two-sorted-lists', 'BN'],
  [141, 'Linked List Cycle',               'E', 'linked-list-cycle', 'BN'],
  [19,  'Remove Nth Node From End of List','M', 'remove-nth-node-from-end-of-list', 'BN'],
  [143, 'Reorder List',                    'M', 'reorder-list', 'N'],
  [287, 'Find the Duplicate Number',       'M', 'find-the-duplicate-number', 'N'],
  [23,  'Merge k Sorted Lists',            'H', 'merge-k-sorted-lists', 'BN']
],
't-stackq': [
  [20,  'Valid Parentheses',               'E', 'valid-parentheses', 'BN'],
  [155, 'Min Stack',                       'M', 'min-stack', 'N'],
  [150, 'Evaluate Reverse Polish Notation','M', 'evaluate-reverse-polish-notation', 'N'],
  [22,  'Generate Parentheses',            'M', 'generate-parentheses', 'N'],
  [232, 'Implement Queue using Stacks',    'E', 'implement-queue-using-stacks', '']
],
't-monostack': [
  [739, 'Daily Temperatures',              'M', 'daily-temperatures', 'N'],
  [496, 'Next Greater Element I',          'E', 'next-greater-element-i', ''],
  [853, 'Car Fleet',                       'M', 'car-fleet', 'N'],
  [901, 'Online Stock Span',               'M', 'online-stock-span', 'N'],
  [84,  'Largest Rectangle in Histogram',  'H', 'largest-rectangle-in-histogram', 'N']
],

/* ── Phase 4 ── */
't-recursion': [
  [509, 'Fibonacci Number',                'E', 'fibonacci-number', ''],
  [206, 'Reverse Linked List',             'E', 'reverse-linked-list', 'BN'],
  [50,  'Pow(x, n)',                       'M', 'powx-n', 'N'],
  [779, 'K-th Symbol in Grammar',          'M', 'k-th-symbol-in-grammar', '']
],
't-backtrack': [
  [78,  'Subsets',                         'M', 'subsets', 'N'],
  [46,  'Permutations',                    'M', 'permutations', 'N'],
  [39,  'Combination Sum',                 'M', 'combination-sum', 'BN'],
  [17,  'Letter Combinations of a Phone Number', 'M', 'letter-combinations-of-a-phone-number', 'N'],
  [79,  'Word Search',                     'M', 'word-search', 'N'],
  [131, 'Palindrome Partitioning',         'M', 'palindrome-partitioning', 'N'],
  [51,  'N-Queens',                        'H', 'n-queens', 'N']
],
't-divide': [
  [912, 'Sort an Array',                   'M', 'sort-an-array', ''],
  [215, 'Kth Largest Element in an Array', 'M', 'kth-largest-element-in-an-array', 'N'],
  [23,  'Merge k Sorted Lists',            'H', 'merge-k-sorted-lists', 'BN'],
  [53,  'Maximum Subarray',                'M', 'maximum-subarray', 'BN']
],

/* ── Phase 5 ── */
't-tree': [
  [226, 'Invert Binary Tree',              'E', 'invert-binary-tree', 'BN'],
  [104, 'Maximum Depth of Binary Tree',    'E', 'maximum-depth-of-binary-tree', 'BN'],
  [100, 'Same Tree',                       'E', 'same-tree', 'BN'],
  [543, 'Diameter of Binary Tree',         'E', 'diameter-of-binary-tree', 'N'],
  [110, 'Balanced Binary Tree',            'E', 'balanced-binary-tree', 'N'],
  [102, 'Binary Tree Level Order Traversal','M', 'binary-tree-level-order-traversal', 'BN'],
  [199, 'Binary Tree Right Side View',     'M', 'binary-tree-right-side-view', 'N'],
  [105, 'Construct Binary Tree from Preorder and Inorder Traversal', 'M', 'construct-binary-tree-from-preorder-and-inorder-traversal', 'BN'],
  [124, 'Binary Tree Maximum Path Sum',    'H', 'binary-tree-maximum-path-sum', 'BN']
],
't-bst': [
  [700, 'Search in a Binary Search Tree',  'E', 'search-in-a-binary-search-tree', ''],
  [235, 'Lowest Common Ancestor of a BST', 'M', 'lowest-common-ancestor-of-a-binary-search-tree', 'BN'],
  [98,  'Validate Binary Search Tree',     'M', 'validate-binary-search-tree', 'BN'],
  [230, 'Kth Smallest Element in a BST',   'M', 'kth-smallest-element-in-a-bst', 'BN'],
  [701, 'Insert into a Binary Search Tree','M', 'insert-into-a-binary-search-tree', '']
],
't-heap': [
  [703, 'Kth Largest Element in a Stream', 'E', 'kth-largest-element-in-a-stream', 'N'],
  [1046,'Last Stone Weight',               'E', 'last-stone-weight', 'N'],
  [973, 'K Closest Points to Origin',      'M', 'k-closest-points-to-origin', 'N'],
  [215, 'Kth Largest Element in an Array', 'M', 'kth-largest-element-in-an-array', 'N'],
  [621, 'Task Scheduler',                  'M', 'task-scheduler', 'BN'],
  [295, 'Find Median from Data Stream',    'H', 'find-median-from-data-stream', 'BN']
],
't-trie': [
  [208, 'Implement Trie (Prefix Tree)',    'M', 'implement-trie-prefix-tree', 'BN'],
  [211, 'Design Add and Search Words Data Structure', 'M', 'design-add-and-search-words-data-structure', 'BN'],
  [212, 'Word Search II',                  'H', 'word-search-ii', 'BN']
],

/* ── Phase 6 ── */
't-graphrep': [
  [1971,'Find if Path Exists in Graph',    'E', 'find-if-path-exists-in-graph', ''],
  [133, 'Clone Graph',                     'M', 'clone-graph', 'BN'],
  [797, 'All Paths From Source to Target', 'M', 'all-paths-from-source-to-target', '']
],
't-bfsdfs': [
  [200, 'Number of Islands',               'M', 'number-of-islands', 'BN'],
  [695, 'Max Area of Island',              'M', 'max-area-of-island', 'N'],
  [994, 'Rotting Oranges',                 'M', 'rotting-oranges', 'N'],
  [130, 'Surrounded Regions',              'M', 'surrounded-regions', 'N'],
  [417, 'Pacific Atlantic Water Flow',     'M', 'pacific-atlantic-water-flow', 'BN'],
  [127, 'Word Ladder',                     'H', 'word-ladder', 'N']
],
't-topo': [
  [207, 'Course Schedule',                 'M', 'course-schedule', 'BN'],
  [210, 'Course Schedule II',              'M', 'course-schedule-ii', 'N'],
  [269, 'Alien Dictionary',                'H', 'alien-dictionary', 'BN']
],
't-dsu': [
  [323, 'Number of Connected Components in an Undirected Graph', 'M', 'number-of-connected-components-in-an-undirected-graph', 'BN'],
  [261, 'Graph Valid Tree',                'M', 'graph-valid-tree', 'BN'],
  [684, 'Redundant Connection',            'M', 'redundant-connection', 'N'],
  [128, 'Longest Consecutive Sequence',    'M', 'longest-consecutive-sequence', 'BN']
],
't-shortest': [
  [743, 'Network Delay Time',              'M', 'network-delay-time', 'N'],
  [787, 'Cheapest Flights Within K Stops', 'M', 'cheapest-flights-within-k-stops', 'N'],
  [778, 'Swim in Rising Water',            'H', 'swim-in-rising-water', 'N']
],
't-mst': [
  [1584,'Min Cost to Connect All Points',  'M', 'min-cost-to-connect-all-points', 'N']
],

/* ── Phase 7 ── */
't-memo': [
  [509, 'Fibonacci Number',                'E', 'fibonacci-number', ''],
  [70,  'Climbing Stairs',                 'E', 'climbing-stairs', 'BN'],
  [322, 'Coin Change',                     'M', 'coin-change', 'BN'],
  [139, 'Word Break',                      'M', 'word-break', 'BN']
],
't-dp1': [
  [70,  'Climbing Stairs',                 'E', 'climbing-stairs', 'BN'],
  [746, 'Min Cost Climbing Stairs',        'E', 'min-cost-climbing-stairs', 'N'],
  [198, 'House Robber',                    'M', 'house-robber', 'BN'],
  [213, 'House Robber II',                 'M', 'house-robber-ii', 'BN'],
  [5,   'Longest Palindromic Substring',   'M', 'longest-palindromic-substring', 'BN'],
  [300, 'Longest Increasing Subsequence',  'M', 'longest-increasing-subsequence', 'BN'],
  [91,  'Decode Ways',                     'M', 'decode-ways', 'BN']
],
't-dp2': [
  [62,  'Unique Paths',                    'M', 'unique-paths', 'BN'],
  [1143,'Longest Common Subsequence',      'M', 'longest-common-subsequence', 'BN'],
  [64,  'Minimum Path Sum',                'M', 'minimum-path-sum', ''],
  [97,  'Interleaving String',             'M', 'interleaving-string', 'N'],
  [72,  'Edit Distance',                   'M', 'edit-distance', 'N'],
  [329, 'Longest Increasing Path in a Matrix', 'H', 'longest-increasing-path-in-a-matrix', 'N']
],
't-knapsack': [
  [416, 'Partition Equal Subset Sum',      'M', 'partition-equal-subset-sum', 'N'],
  [494, 'Target Sum',                      'M', 'target-sum', 'N'],
  [322, 'Coin Change',                     'M', 'coin-change', 'BN'],
  [518, 'Coin Change II',                  'M', 'coin-change-ii', 'N'],
  [1049,'Last Stone Weight II',            'M', 'last-stone-weight-ii', '']
],

/* ── Phase 8 ── */
't-greedy': [
  [53,  'Maximum Subarray',                'M', 'maximum-subarray', 'BN'],
  [55,  'Jump Game',                       'M', 'jump-game', 'BN'],
  [45,  'Jump Game II',                    'M', 'jump-game-ii', 'N'],
  [134, 'Gas Station',                     'M', 'gas-station', 'N'],
  [763, 'Partition Labels',                'M', 'partition-labels', 'N'],
  [3302,'Find the Lexicographically Smallest Valid Sequence', 'M', 'find-the-lexicographically-smallest-valid-sequence', '']
],
't-intervals': [
  [252, 'Meeting Rooms',                   'E', 'meeting-rooms', 'BN'],
  [56,  'Merge Intervals',                 'M', 'merge-intervals', 'BN'],
  [57,  'Insert Interval',                 'M', 'insert-interval', 'BN'],
  [435, 'Non-overlapping Intervals',       'M', 'non-overlapping-intervals', 'BN'],
  [253, 'Meeting Rooms II',                'M', 'meeting-rooms-ii', 'BN']
],
't-bits': [
  [136, 'Single Number',                   'E', 'single-number', 'N'],
  [191, 'Number of 1 Bits',                'E', 'number-of-1-bits', 'BN'],
  [338, 'Counting Bits',                   'E', 'counting-bits', 'BN'],
  [268, 'Missing Number',                  'E', 'missing-number', 'BN'],
  [190, 'Reverse Bits',                    'E', 'reverse-bits', 'BN'],
  [371, 'Sum of Two Integers',             'M', 'sum-of-two-integers', 'BN']
],
't-math': [
  [66,  'Plus One',                        'E', 'plus-one', 'N'],
  [202, 'Happy Number',                    'E', 'happy-number', 'N'],
  [73,  'Set Matrix Zeroes',               'M', 'set-matrix-zeroes', 'N'],
  [48,  'Rotate Image',                    'M', 'rotate-image', 'N'],
  [50,  'Pow(x, n)',                       'M', 'powx-n', 'N'],
  [43,  'Multiply Strings',                'M', 'multiply-strings', 'N']
],
't-mock': [
  [146, 'LRU Cache',                       'M', 'lru-cache', 'N'],
  [297, 'Serialize and Deserialize Binary Tree', 'H', 'serialize-and-deserialize-binary-tree', 'BN'],
  [76,  'Minimum Window Substring',        'H', 'minimum-window-substring', 'BN'],
  [124, 'Binary Tree Maximum Path Sum',    'H', 'binary-tree-maximum-path-sum', 'BN'],
  [312, 'Burst Balloons',                  'H', 'burst-balloons', 'N']
]
};

const LC_URL   = p => 'https://leetcode.com/problems/' + p[3] + '/';
const LC_DIFF  = { E:'Easy', M:'Medium', H:'Hard' };

/** Unique problems across the whole roadmap. */
function lcStats(){
  const seen = new Map();
  Object.values(LC).forEach(list => list.forEach(p => seen.set(p[0], p)));
  const all = [...seen.values()];
  return {
    unique: all.length,
    easy:   all.filter(p => p[2] === 'E').length,
    medium: all.filter(p => p[2] === 'M').length,
    hard:   all.filter(p => p[2] === 'H').length,
    blind:  all.filter(p => p[4].indexOf('B') >= 0).length,
    neet:   all.filter(p => p[4].indexOf('N') >= 0).length
  };
}
