```
                         ┌───────────────────────────────┐
                         │         MAIN BRANCH           │
                         │  - Stable production code     │
                         │  - Only merge from dev/hotfix │
                         └──────────────┬────────────────┘
                                        ▲
                                        │
                          ┌─────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │                                   │
┌────────────────────────────┐     ┌────────────────────────────┐
│         DEV BRANCH         │     │        HOTFIX BRANCH       │
│  - Integrates tested       │     │  - Urgent fixes for main   │
│    features before release │     │  - Branched from main      │
│  - Merge from feature      │     │  - Merge to main and dev   │
└──────────────┬─────────────┘     └──────────────┬─────────────┘
               ▲                                 ▲
               │                                 │
   ┌───────────┘                                 │
   │                                             │
┌────────────────────────────┐                   │
│       FEATURE BRANCH       │                   │
│  - For new features or     │                   │
│    enhancements            │                   │
│  - Branched from dev       │                   │
│  - Merge to dev when done  │                   │
└────────────────────────────┘                   │
                                                 │
                                                 │
                    ┌────────────────────────────┘
                    │
                    ▼
          ┌────────────────────────────┐
          │          MAIN              │
          │   (Stable release ready)   │
          └────────────────────────────┘
```
Typical Flow Summary
(feature) → dev → main
(hotfix) → main + dev

How to: 

1. Commmitting and Pushing to a Branch

A. Switch to a branch 
    
    If working on a feature: 
    
    git checkout -b feature/new-feature

B. Stage your changes

    git add . 

C. Commit your changes

    git commit -m "Add new features for user registration" 

D. Push to the branch 

    git push origin feature/new-feature

2. Merging Branches

A. Merge feature branch into dev 
Once feature is done and pushed: 

    git checkout dev
    git pull origin dev
    git merge feature/new-feature

Then push the updated dev branch: 

    git push origin dev

B. Merge dev into main (for release) 
When everything in dev is stable: 

    git checkout main 
    git pull origin main
    git merge dev
    git push origin main

C. Merge hotfix into main and dev
If you fixed something critical: 

    git checkout main 
    git pull origin main 
    git merge hotfix/fix-login-bug
    git push origin main

Then update dev so it has the same line: 

    git checkout dev
    git pull origin dev
    git merge hotfix/fix-login-bug
    git push origin dev