# Phase 1: The Ultimate Testing Checklist

Open your app on localhost:5173 and follow these exact steps. You will need two browsers (or one normal window and one Incognito window) to test the Admin and User flows simultaneously.
Step 1: Admin Setup

    Register a new user (e.g., 0900000000).

    Go to your Supabase Table Editor -> profiles. Find your user and manually set is_admin = true.

    Log into the app. You should now see an /admin link or tab in the navigation.

    Go to Admin Videos. Add 3 YouTube videos with a duration of 30 seconds each. Set the reward to 10 ETB.

    Go to Admin Settings. Verify the default settings are there (Basic Limit: 5, VIP1 Limit: 15, etc.).

Step 2: User Signup & Pending State

    Open an Incognito window (so you are logged out).

    Register a new user. Use the referral code from your Admin user.

    Test: Can this new user watch videos? Since their account_status is pending, they should ideally be blocked from earning until the registration fee is paid. If they can watch videos without paying, you need to tell Kilo to fix this.

Step 3: Video Watching & Quota (As Basic User)

    If you are allowed to watch, watch a video.

    Test the Timer: Close the video halfway through. Reopen it. Did it resume from where you left off?

    Test the Quota: Watch videos until you hit the Basic limit (default 5).

    Test the Block: Try to watch a 6th video. It should be disabled and say "Daily quota reached."

Step 4: Manual Deposit & VIP Upgrade

    As the new user, go to Wallet -> Deposit.

    Submit a deposit of 500 ETB. The status should be "pending".

    Go back to your Admin window. Go to Admin Payments. You should see the pending deposit.

    Click Approve.

    Go back to the User window and refresh the page.

    Test: The user's balance/VIP level should now be VIP1, and their account_status should be active. Their daily quota should now be 15.

Step 5: Referral & Withdrawal Gate

    As the Admin, check your own profile. Your successful_referrals should now be 1 (because you approved the user's payment).

    As the User, try to withdraw money.

    Test: The app should block you and say "You need 5 successful referrals to withdraw. You currently have 0." (or 1 if the logic counts the referral from the admin's perspective, depending on how Kilo built it).

    If it allows you to withdraw without 5 referrals, that is a bug.