UserAccount.login { username: 'madalinatest', password: 'madalinatest' } => { user: '019abcdc-588a-7a50-9fec-69f4332d82bb' }


Sessioning.create { user: '019abcdc-588a-7a50-9fec-69f4332d82bb' } => { sessionId: '019ad68d-24bf-754e-839b-c2b1ad562600' }


Requesting.respond {
  request: '019ad68d-248c-7644-952e-02c779a89d4b',
  user: '019abcdc-588a-7a50-9fec-69f4332d82bb',
  sessionId: '019ad68d-24bf-754e-839b-c2b1ad562600'
} => { request: '019ad68d-248c-7644-952e-02c779a89d4b' }

[Requesting] Received request for path: /Post/createPost

Requesting.request {
  sessionId: '019ad68d-24bf-754e-839b-c2b1ad562600',
  content: 'test test test test',
  postType: 'PROGRESS',
  items: [],
  visibility: 'PUBLIC',
  path: '/Post/createPost'
} => { request: '019ad68d-521d-7ca4-b177-fa3ea7fba280' }


Post.createPost {
  author: '019abcdc-588a-7a50-9fec-69f4332d82bb',
  content: 'test test test test',
  postType: 'PROGRESS',
  items: [],
  visibility: 'PUBLIC'
} => { postId: '019ad68d-523f-7990-888a-d50f88371361' }


Requesting.respond {
  request: '019ad68d-521d-7ca4-b177-fa3ea7fba280',
  postId: '019ad68d-523f-7990-888a-d50f88371361'
} => { request: '019ad68d-521d-7ca4-b177-fa3ea7fba280' }

Post.editPostVisibility {
  sessionId: '019ad68d-24bf-754e-839b-c2b1ad562600',
  postId: '019ad68d-523f-7990-888a-d50f88371361',
  newVisibility: 'PRIVATE'
} => { error: 'Permission denied: user is not the author of the post' }

