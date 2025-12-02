Session info:
{
  "_id": "019add4a-9efb-7b29-b095-18ad931a4212",
  "user": "019adba8-a631-7f49-bda0-59b4be51a752"
}




Requesting.request {
  sessionId: '019add4a-9efb-7b29-b095-18ad931a4212',
  user: '019adba8-a631-7f49-bda0-59b4be51a752',
  path: '/UserAccount/_isKidOrPrivateAccount'
} => { request: '019add4b-0afb-7266-b0aa-1afcca1cbba4' }


Requesting.respond {
  request: '019add4b-0afb-7266-b0aa-1afcca1cbba4',
  results: [],
  error: 'Unauthorized'
} => { request: '019add4b-0afb-7266-b0aa-1afcca1cbba4' }

[Requesting] Received request for path: /Post/_getPostsViewableToUser
[Requesting] Received request for path: /UserAccount/_isKidOrPrivateAccount
[Requesting] Received request for path: /Friendship/_getPendingFriendships
[Requesting] Received request for path: /Friendship/_getFriends

Requesting.request {
  sessionId: '019add4a-9efb-7b29-b095-18ad931a4212',
  user: '019adba8-a631-7f49-bda0-59b4be51a752',
  path: '/Post/_getPostsViewableToUser'
} => { request: '019add4b-0b5e-7c97-af49-5551daf2d466' }


Requesting.request {
  sessionId: '019add4a-9efb-7b29-b095-18ad931a4212',
  user: '019adba8-a631-7f49-bda0-59b4be51a752',
  path: '/Friendship/_getPendingFriendships'
} => { request: '019add4b-0b61-7561-9b3f-aa21f598036b' }


Requesting.request {
  sessionId: '019add4a-9efb-7b29-b095-18ad931a4212',
  user: '019adba8-a631-7f49-bda0-59b4be51a752',
  path: '/UserAccount/_isKidOrPrivateAccount'
} => { request: '019add4b-0b60-7b31-bc9f-b0d572cae6a7' }


Requesting.respond {
  request: '019add4b-0b61-7561-9b3f-aa21f598036b',
  results: [],
  error: 'Unauthorized'
} => { request: '019add4b-0b61-7561-9b3f-aa21f598036b' }


Requesting.respond {
  request: '019add4b-0b60-7b31-bc9f-b0d572cae6a7',
  results: [],
  error: 'Unauthorized'
} => { request: '019add4b-0b60-7b31-bc9f-b0d572cae6a7' }

[Requesting] Error processing request: Missing binding: Symbol(error) in frame: [object Object]

Requesting.request {
  sessionId: '019add4a-9efb-7b29-b095-18ad931a4212',
  user: '019adba8-a631-7f49-bda0-59b4be51a752',
  path: '/Friendship/_getFriends'
} => { request: '019add4b-0b61-7760-a029-c3d2f1f3efa8' }


Requesting.respond {
  request: '019add4b-0b61-7760-a029-c3d2f1f3efa8',
  friends: [],
  error: 'Unauthorized'
} => { request: '019add4b-0b61-7760-a029-c3d2f1f3efa8' }

