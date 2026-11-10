import test from 'node:test';
import assert from 'node:assert/strict';
import { HNClient } from '../js/api/hnClient.js';

test('HNClient - getPollDetails enriches poll items with percentages and total votes', async () => {
  const client = new HNClient();

  // Mock getItems method
  client.getItems = async (parts) => {
    return [
      { id: 10, poll: 1, score: 75, text: 'Option A' },
      { id: 11, poll: 1, score: 25, text: 'Option B' }
    ];
  };

  const rawPoll = {
    id: 1,
    title: 'Favorite Editor?',
    type: 'poll',
    parts: [10, 11]
  };

  const enriched = await client.getPollDetails(rawPoll);

  assert.equal(enriched.totalVotes, 100);
  assert.equal(enriched.pollOptions.length, 2);
  assert.equal(enriched.pollOptions[0].percentage, 75);
  assert.equal(enriched.pollOptions[1].percentage, 25);
  assert.equal(enriched.pollOptions[0].id, 10);
});

test('HNClient - handles poll with no parts gracefully', async () => {
  const client = new HNClient();
  const rawPoll = { id: 2, title: 'Empty Poll', type: 'poll' };

  const enriched = await client.getPollDetails(rawPoll);
  assert.equal(enriched.totalVotes, 0);
  assert.deepEqual(enriched.pollOptions, []);
});
