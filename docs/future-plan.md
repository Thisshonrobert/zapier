- make the support operator  to  support team with multiple members .
SupportTeam
   │
   ├── Thisshon
   ├── Alice
   ├── Bob
   └── Charlie

and ideally:

SupportMember
    userId
    teamId
    role
    active

For example:

SupportTeam
 ├── Admin
 ├── Investigator
 └── Reviewer

Then later you could have:

Alice → can investigate
Bob   → can investigate + approve
Charlie → read-only

- able to connect with mutiple platform.