import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCommentTree } from '../js/utils/commentTree.js';

test('buildCommentTree - correctly links parent and sorts newest to oldest', () => {
  const rootPostId = 1000;

  // Unordered raw comments with parent references and timestamps
  const rawComments = [
    { id: 101, parent: 1000, by: 'alice', time: 100, text: 'Oldest top comment' },
    { id: 102, parent: 1000, by: 'bob', time: 300, text: 'Newest top comment' },
    { id: 103, parent: 1000, by: 'charlie', time: 200, text: 'Middle top comment' },
    // Sub-comments replying to 102
    { id: 201, parent: 102, by: 'dave', time: 310, text: 'Sub-reply 1' },
    { id: 202, parent: 102, by: 'eve', time: 350, text: 'Newer sub-reply' },
    // Sub-sub-comment replying to 201
    { id: 301, parent: 201, by: 'frank', time: 320, text: 'Deep sub-reply' }
  ];

  const tree = buildCommentTree(rawComments, rootPostId);

  // 1. Verify top-level comment count
  assert.equal(tree.length, 3, 'Should have 3 top-level comments');

  // 2. Verify newest-to-oldest ordering at root level:
  // Expected order: 102 (time 300) -> 103 (time 200) -> 101 (time 100)
  assert.equal(tree[0].id, 102, 'First top comment should be newest (time: 300)');
  assert.equal(tree[1].id, 103, 'Second top comment should be middle (time: 200)');
  assert.equal(tree[2].id, 101, 'Third top comment should be oldest (time: 100)');

  // 3. Verify parent relationship for all top-level comments
  assert.equal(tree[0].parent, rootPostId);
  assert.equal(tree[1].parent, rootPostId);
  assert.equal(tree[2].parent, rootPostId);

  // 4. Verify sub-comments under 102
  const node102 = tree[0];
  assert.equal(node102.children.length, 2, 'Comment 102 should have 2 direct children');

  // Children must also be sorted newest to oldest:
  // Expected order: 202 (time 350) -> 201 (time 310)
  assert.equal(node102.children[0].id, 202, 'Newer sub-reply should come first');
  assert.equal(node102.children[1].id, 201, 'Older sub-reply should come second');
  assert.equal(node102.children[0].parent, 102);
  assert.equal(node102.children[1].parent, 102);

  // 5. Verify 3rd-level nesting under 201
  const node201 = node102.children[1];
  assert.equal(node201.children.length, 1);
  assert.equal(node201.children[0].id, 301);
  assert.equal(node201.children[0].parent, 201);
  assert.equal(node201.children[0].depth, 2);

  // 6. Verify descendant count calculation
  // Node 102 has 202 (0 kids) + 201 (1 kid: 301) = 3 total descendants
  assert.equal(node102.getDescendantCount(), 3);
});
