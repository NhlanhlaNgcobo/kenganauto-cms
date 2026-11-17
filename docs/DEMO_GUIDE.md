# Presenting KenganAuto with the Acme Cars website

**The story in one line:** a customer browses a dealership's website, and the dealer watches it turn into leads, finance applications and bookings in KenganAuto, live.

## Before the meeting (5 minutes)

1. `powershell -ExecutionPolicy Bypass -File .\start-demo.ps1 -Reseed`
   This resets the demo dealership to a clean dataset and opens both sites. Use `-Reseed` every time. It removes anything created during rehearsals.
2. Arrange two windows side by side: **Acme Cars** (http://localhost:5174) on the left and the **dashboard** (http://localhost:5173) on the right.
3. On the dashboard, click **Explore the demo**. You are signed in as Nomvula Khumalo, Dealer Principal.

| Role logins (password `demo1234`) | Use for |
|---|---|
| `admin@enterprise-demo.co.za` | Everything (default) |
| `sales@`, `kyle@`, `priya@enterprise-demo.co.za` | Sales exec view, personal targets |
| `service@enterprise-demo.co.za` | Service + Customer Care |
| `finance@` / `parts@enterprise-demo.co.za` | Finance / Parts |

## The walkthrough (about 10 minutes)

**1. The dealer's world (dashboard, 1 min).** Show the Overview: units sold and revenue up on last month, speed-to-lead, and **Website activity · Live** with the most-viewed cars this week.

**2. Be the customer (Acme site, 2 min).** Scroll the hero and inventory, then filter to *New*. Open the **Land Rover Defender** and point out the real photo, specs and estimated monthly instalment.

**3. Book a test drive (30 s).** Fill in a name and mobile, tick consent, and click **Book my test drive**.
→ On the dashboard a toast appears within about 5 seconds: *"New from your website: … booked a test drive — 2023 Land Rover Defender."* The feed row lights up. Click **Open**. The lead sits in *Test Drive*, with the preferred slot and *"viewed N vehicle pages before enquiring"* in its notes.

**4. Finance (1 min).** On the same car, open the **Finance** tab, enter an income and submit.
→ The dashboard captures a *Qualified* lead with an affordability %, plus a finance application ready for the F&I desk.

**5. Trade-in (1 min).** On the homepage, go to **Sell or trade**, enter `2019 Toyota Fortuner, 98 000 km` and click **Get my estimate**. The customer sees an instant range; submit with contact details.
→ It appears in **Trade-Ins** as *Valued*, with the estimate.

**5b. Buy online (1 min).** Open any available car and click **Buy it online → Start**. Choose finance, tick a trade-in, choose delivery, enter details and **Reserve this car**.
→ A toast appears, and **Online Deals** shows the full deal: monthly instalment, trade-in estimate, delivery date and a 48-hour hold countdown. The car shows *Reserved* on the website. Move it through *Paperwork → Approved → Handed over* to show the car being marked sold and the lead won.

**Every website lead gets an instant AI reply.** Point at the green **AI replied to … on WhatsApp in Ns** rows in the live feed. Without a 360dialog key the message is queued, not delivered. Without an Anthropic key a tailored template is used instead of Claude.

**6. Service (30 s).** Book a service.
→ It appears in **Service** with the customer's name and phone. A customer record is created automatically. Open a booking and click **Run inspection**. Priced findings appear, the advisor marks each one *Approved* or *Declined*, and **Send to customer on WhatsApp** sends the list. With an Anthropic key, add check-in photos for AI photo analysis.

**7. Chat (optional).** Open the chat bubble on Acme Cars. It is branded Acme, and conversations land in **AI Chat**.

**8. Close the loop (2 min).** Show **Targets** (scorecards, at-risk flags) and **Customer Care** (WhatsApp CSI surveys after every service; low scores auto-open a concern with an SLA owner).

**9. Prove it (1 min).** Open **AI Impact**. It shows before and after AI went live: median first response (2.1 h → 30 s), leads answered within 5 minutes, visits booked, lead-to-sale conversion, the estimated extra sales in rand, gross profit per unit, online deals and approved service work. Say plainly that this compares periods rather than running a controlled experiment. The page says so too, and that honesty is the point: Cox Automotive found most dealers can't show what their AI earns.

## If something goes wrong
- **Nothing appears on the dashboard:** check that the API window (:3000) is running, then refresh the dashboard. The panel polls every 6 seconds.
- **"Session expired":** click **Explore the demo** again.
- **The site shows "couldn't load our live stock":** the API isn't running. Start `start-demo.ps1` again.
- **Messy data after rehearsals:** close everything and run `start-demo.ps1 -Reseed`.

## Honest framing
- Acme Cars is a fictional dealership (its footer says so). The stock, prices and photos come from the demo dataset. The photos are real, credited Wikimedia Commons images.
- The chat assistant uses Claude when `ANTHROPIC_API_KEY` is set. Without a key it falls back to a polite holding reply, so set the key before a client demo if you want live AI answers.
- WhatsApp sending needs a 360dialog key. Without one, messages are queued, not delivered.
