import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, MapPin, Search } from "lucide-react";
import { getAllProperties } from "../data/propertyStorage";
import {
  getPropertyAddressLabel,
  getPropertyPrimaryImage,
} from "../data/propertySearchData";

const SEO_LANDING_PROPERTY_LIMIT = 10;

const DALLAS_LANDING_PAGES = {
  "dallas-tx": {
    title: "Dallas Apartments With Verified Specials",
    eyebrow: "Dallas apartment deals",
    description:
      "Search Dallas apartments by rent specials, effective rent, bedroom type, neighborhood, and property details.",
    searchLabel: "Browse Dallas apartments",
    searchUrl: "/properties?search=Dallas%2C%20TX",
    primaryKeyword: "Dallas apartments",
    highlight: "Compare normal rent, effective rent, and current specials before you tour.",
    sections: [
      {
        title: "Find Dallas apartments with transparent pricing",
        text: "Below Market Apartments helps renters compare listed rent, estimated effective rent, active specials, and available floor plans in one place.",
      },
      {
        title: "Use filters built for real apartment shopping",
        text: "Filter by price range, bedroom count, map area, and specials so the results match the type of unit you are actually looking for.",
      },
    ],
    relatedLinks: [
      { label: "Dallas apartment specials", to: "/apartments/dallas-tx/specials" },
      { label: "8 weeks free apartments", to: "/apartments/dallas-tx/8-weeks-free" },
    ],
  },
  specials: {
    title: "Dallas Apartments With Rent Specials",
    eyebrow: "Dallas rent specials",
    description:
      "Find Dallas apartments with current move-in specials, weeks-free offers, rent credits, and transparent effective rent estimates.",
    searchLabel: "Search Dallas specials",
    searchUrl: "/properties?search=special",
    primaryKeyword: "Dallas apartment specials",
    highlight: "See the special and the estimated effective rent without guessing what the deal means.",
    sections: [
      {
        title: "Compare specials without losing the normal rent",
        text: "Renters can see both normal rent and estimated effective rent so a special feels clear instead of confusing.",
      },
      {
        title: "Built for concessions like weeks free and rent credits",
        text: "Use this page when you want apartments offering concessions such as four weeks free, six weeks free, eight weeks free, or rent-credit specials.",
      },
    ],
    relatedLinks: [
      { label: "All Dallas apartments", to: "/apartments/dallas-tx" },
      { label: "8 weeks free apartments", to: "/apartments/dallas-tx/8-weeks-free" },
    ],
  },
  "8-weeks-free": {
    title: "Dallas Apartments With 8 Weeks Free",
    eyebrow: "8 weeks free apartments",
    description:
      "Browse Dallas apartments advertising 8 weeks free and compare the estimated effective rent, normal rent, and available bedroom types.",
    searchLabel: "Search 8 weeks free",
    searchUrl: "/properties?search=8%20weeks%20free",
    primaryKeyword: "8 weeks free apartments Dallas",
    highlight: "Properties with 8+ weeks free are highlighted with gold deal signals across the search experience.",
    sections: [
      {
        title: "Understand what 8 weeks free really means",
        text: "The monthly amount due may still be based on normal rent plus required fees. Below Market Apartments shows the estimated effective value so renters know what to ask before applying.",
      },
      {
        title: "Filter by bedrooms and budget",
        text: "Search cards adjust to the renter's selected bedroom and price filters, helping you compare the units that actually match your budget.",
      },
    ],
    relatedLinks: [
      { label: "Dallas apartment specials", to: "/apartments/dallas-tx/specials" },
      { label: "All Dallas apartments", to: "/apartments/dallas-tx" },
    ],
  },
  "6-weeks-free": {
    title: "Dallas Apartments With 6 Weeks Free",
    eyebrow: "6 weeks free apartments",
    description:
      "Search Dallas apartments advertising 6 weeks free and compare active specials, normal rent, effective rent, photos, and available floor plans.",
    searchLabel: "Search 6 weeks free",
    searchUrl: "/properties?search=6%20weeks%20free",
    primaryKeyword: "6 weeks free apartments Dallas",
    highlight:
      "Compare Dallas properties offering 6 weeks free with the normal rent and estimated effective value side by side.",
    sections: [
      {
        title: "Compare the concession before touring",
        text: "Six weeks free can be applied differently by each property. Review normal rent, estimated effective rent, and the listed special before deciding which tour is worth your time.",
      },
      {
        title: "Find Dallas floor plans with active specials",
        text: "Use this page to start with the special, then narrow by bedrooms, budget, neighborhood, and availability on the full search page.",
      },
    ],
    relatedLinks: [
      { label: "8 weeks free apartments", to: "/apartments/dallas-tx/8-weeks-free" },
      { label: "4 weeks free apartments", to: "/dallas-apartments-4-weeks-free" },
      { label: "Dallas apartment specials", to: "/apartments/dallas-tx/specials" },
    ],
  },
  "4-weeks-free": {
    title: "Dallas Apartments With 4 Weeks Free",
    eyebrow: "4 weeks free apartments",
    description:
      "Browse Dallas apartments with 4 weeks free, one month free, rent credits, effective rent estimates, and live property details.",
    searchLabel: "Search 4 weeks free",
    searchUrl: "/properties?search=4%20weeks%20free",
    primaryKeyword: "4 weeks free apartments Dallas",
    highlight:
      "See apartments with 4 weeks free or one month free while keeping normal rent, effective rent, and fees in view.",
    sections: [
      {
        title: "One month free can still vary by property",
        text: "Some communities advertise 4 weeks free, while others say one month free or a base-rent credit. Compare the estimated value before applying.",
      },
      {
        title: "Use specials as a starting point",
        text: "After finding a 4 weeks free offer, confirm the exact floor plan, lease term, move-in window, and required monthly fees.",
      },
    ],
    relatedLinks: [
      { label: "6 weeks free apartments", to: "/dallas-apartments-6-weeks-free" },
      { label: "8 weeks free apartments", to: "/apartments/dallas-tx/8-weeks-free" },
      { label: "Dallas apartment specials", to: "/apartments/dallas-tx/specials" },
    ],
  },
  "no-deposit": {
    title: "Dallas Apartments With No Deposit Specials",
    eyebrow: "No deposit apartment deals",
    description:
      "Find Dallas apartments advertising no deposit, zero deposit, waived deposit, or low move-in cost specials with transparent pricing details.",
    searchLabel: "Search no deposit apartments",
    searchUrl: "/properties?search=no%20deposit",
    primaryKeyword: "no deposit apartments Dallas",
    highlight:
      "Look for Dallas apartments with no-deposit, zero-deposit, or waived-deposit specials while still comparing rent and fees.",
    sections: [
      {
        title: "No deposit does not always mean no move-in cost",
        text: "Renters should still confirm application fees, admin fees, monthly fees, risk fees, and whether a deposit alternative is required.",
      },
      {
        title: "Compare move-in savings with rent value",
        text: "A no-deposit special can lower upfront cost, while weeks-free specials may lower the estimated lease value. Review both before choosing a property.",
      },
    ],
    relatedLinks: [
      { label: "Dallas apartment specials", to: "/apartments/dallas-tx/specials" },
      { label: "4 weeks free apartments", to: "/dallas-apartments-4-weeks-free" },
      { label: "All Dallas apartments", to: "/apartments/dallas-tx" },
    ],
  },
  "dallas-luxury-specials": {
    title: "Dallas Luxury Apartments With Specials",
    eyebrow: "Luxury apartment specials",
    description:
      "Search Dallas luxury apartments with current rent specials, weeks-free offers, waived fees, photos, floor plans, and transparent effective rent estimates.",
    searchLabel: "Search luxury specials",
    searchUrl: "/properties?search=luxury%20special",
    primaryKeyword: "Dallas luxury apartments specials",
    highlight:
      "Compare luxury Dallas apartments by current special, normal rent, estimated effective rent, floor plans, and location.",
    sections: [
      {
        title: "Luxury pricing needs clear deal math",
        text: "Higher-rent apartments can make concessions look bigger, but renters should still compare the normal rent, effective value, fees, and lease term.",
      },
      {
        title: "Look for the right lifestyle fit",
        text: "Use photos, floor plans, amenities, map details, and specials together before deciding which Dallas luxury communities are worth touring.",
      },
    ],
    relatedLinks: [
      { label: "Dallas apartment specials", to: "/apartments/dallas-tx/specials" },
      { label: "Uptown Dallas specials", to: "/apartments/dallas-tx/uptown" },
      { label: "No deposit apartments", to: "/dallas-apartments-no-deposit" },
    ],
  },
  "move-in-specials": {
    title: "Dallas Apartments With Move-In Specials",
    eyebrow: "Move-in specials",
    description:
      "Find Dallas apartments with move-in specials including weeks free, waived fees, rent credits, no-deposit offers, and effective rent estimates.",
    searchLabel: "Search move-in specials",
    searchUrl: "/properties?search=move-in%20special",
    primaryKeyword: "Dallas apartments with move-in specials",
    highlight:
      "Start with active move-in specials, then compare the actual rent basis, estimated deal value, available floor plans, and fees.",
    sections: [
      {
        title: "Move-in specials come in different forms",
        text: "A special may be weeks free, a rent credit, waived admin fees, a deposit offer, or a combination. The details matter before applying.",
      },
      {
        title: "Compare the offer against the whole lease",
        text: "Below Market Apartments helps renters compare normal rent and estimated effective rent so the advertised special is easier to understand.",
      },
    ],
    relatedLinks: [
      { label: "8 weeks free apartments", to: "/apartments/dallas-tx/8-weeks-free" },
      { label: "Waived admin fee", to: "/dallas-apartments-waived-admin-fee" },
      { label: "No deposit apartments", to: "/dallas-apartments-no-deposit" },
    ],
  },
  "waived-admin-fee": {
    title: "Dallas Apartments With Waived Admin Fees",
    eyebrow: "Waived fee specials",
    description:
      "Browse Dallas apartments advertising waived admin fees, waived application fees, move-in credits, and current rent specials.",
    searchLabel: "Search waived admin fee",
    searchUrl: "/properties?search=waived%20admin%20fee",
    primaryKeyword: "Dallas apartments waived admin fee",
    highlight:
      "Find Dallas apartments that may lower upfront costs with waived admin fees, waived application fees, or related move-in offers.",
    sections: [
      {
        title: "Waived fees can lower upfront cost",
        text: "A waived admin fee is different from discounted rent. Renters should compare both upfront savings and monthly rent before applying.",
      },
      {
        title: "Ask which fees are actually waived",
        text: "Confirm whether the property is waiving admin fees, application fees, deposits, or only specific charges tied to a move-in window.",
      },
    ],
    relatedLinks: [
      { label: "Move-in specials", to: "/dallas-apartments-with-move-in-specials" },
      { label: "No deposit apartments", to: "/dallas-apartments-no-deposit" },
      { label: "Dallas apartment specials", to: "/apartments/dallas-tx/specials" },
    ],
  },
  "farmers-branch-specials": {
    title: "Farmers Branch Apartments With Specials",
    eyebrow: "Farmers Branch apartment deals",
    description:
      "Search Farmers Branch apartments with current rent specials, effective rent estimates, floor plans, photos, and Dallas-area location context.",
    searchLabel: "Search Farmers Branch",
    searchUrl: "/properties?search=Farmers%20Branch",
    primaryKeyword: "Farmers Branch apartments specials",
    highlight:
      "Compare Farmers Branch apartments by active special, normal rent, estimated effective rent, floor plans, and availability.",
    sections: [
      {
        title: "Find value near North Dallas and Las Colinas",
        text: "Farmers Branch can be a strong option for renters who want Dallas-area access, newer properties, and active leasing concessions.",
      },
      {
        title: "Confirm the exact unit special",
        text: "Specials can change by move-in date and floor plan, so renters should confirm the available unit before applying.",
      },
    ],
    relatedLinks: [
      { label: "Irving apartment specials", to: "/irving-apartments-specials" },
      { label: "Dallas apartment specials", to: "/apartments/dallas-tx/specials" },
      { label: "6 weeks free apartments", to: "/dallas-apartments-6-weeks-free" },
    ],
  },
  "farmers-branch-6-weeks-free": {
    title: "Farmers Branch Apartments With 6 Weeks Free",
    eyebrow: "Farmers Branch 6 weeks free",
    description:
      "Search Farmers Branch apartments advertising 6 weeks free with effective rent estimates, floor plans, photos, and current availability.",
    searchLabel: "Search Farmers Branch 6 weeks free",
    searchUrl: "/properties?search=Farmers%20Branch%206%20weeks%20free",
    primaryKeyword: "Farmers Branch apartments 6 weeks free",
    highlight:
      "Compare Farmers Branch properties offering 6 weeks free with normal rent, estimated effective rent, and live floor plan details.",
    sections: [
      {
        title: "Target Farmers Branch specials directly",
        text: "This page focuses on the city plus the concession so renters do not have to sort through every Dallas-area listing first.",
      },
      {
        title: "Confirm unit and move-in timing",
        text: "Six weeks free may apply only to select homes, lease terms, or move-in dates, so always confirm the exact unit before applying.",
      },
    ],
    relatedLinks: [
      { label: "Farmers Branch specials", to: "/farmers-branch-apartments-specials" },
      { label: "6 weeks free apartments", to: "/dallas-apartments-6-weeks-free" },
      { label: "Las Colinas specials", to: "/las-colinas-apartments-specials" },
    ],
  },
  "irving-specials": {
    title: "Irving Apartments With Specials",
    eyebrow: "Irving apartment deals",
    description:
      "Browse Irving apartments with rent specials, weeks-free offers, effective rent estimates, photos, floor plans, and renter-friendly comparisons.",
    searchLabel: "Search Irving specials",
    searchUrl: "/properties?search=Irving",
    primaryKeyword: "Irving apartments specials",
    highlight:
      "Compare Irving apartment specials near Las Colinas and nearby Dallas-area neighborhoods with clear rent and deal details.",
    sections: [
      {
        title: "Compare Irving and Las Colinas deals",
        text: "Renters can use this page to find active specials and then narrow results by price, bedrooms, and property location.",
      },
      {
        title: "Keep normal rent visible",
        text: "Below Market Apartments keeps normal rent and estimated effective value visible so the special does not hide the true monthly basis.",
      },
    ],
    relatedLinks: [
      { label: "Farmers Branch specials", to: "/farmers-branch-apartments-specials" },
      { label: "8 weeks free apartments", to: "/apartments/dallas-tx/8-weeks-free" },
      { label: "Dallas apartment specials", to: "/apartments/dallas-tx/specials" },
    ],
  },
  "las-colinas-specials": {
    title: "Las Colinas Apartments With Specials",
    eyebrow: "Las Colinas apartment deals",
    description:
      "Browse Las Colinas and Irving apartments with rent specials, weeks-free offers, photos, floor plans, and estimated effective rent.",
    searchLabel: "Search Las Colinas specials",
    searchUrl: "/properties?search=Las%20Colinas",
    primaryKeyword: "Las Colinas apartments specials",
    highlight:
      "Compare Las Colinas apartment specials near Irving with normal rent, estimated effective value, and available floor plans.",
    sections: [
      {
        title: "Search around Las Colinas by value",
        text: "Las Colinas renters can compare active specials and floor plans while keeping commute, rent, and fees in view.",
      },
      {
        title: "Use the special to narrow your tours",
        text: "Start with properties advertising current concessions, then confirm availability and move-in timing before applying.",
      },
    ],
    relatedLinks: [
      { label: "Irving apartment specials", to: "/irving-apartments-specials" },
      { label: "Farmers Branch specials", to: "/farmers-branch-apartments-specials" },
      { label: "8 weeks free apartments", to: "/apartments/dallas-tx/8-weeks-free" },
    ],
  },
  uptown: {
    title: "Uptown Dallas Apartments With Specials",
    eyebrow: "Uptown Dallas apartments",
    description:
      "Search Uptown Dallas apartments with current specials, effective rent estimates, bedroom filters, and map-based apartment search.",
    searchLabel: "Search Uptown Dallas",
    searchUrl: "/properties?search=Uptown%20Dallas",
    primaryKeyword: "Uptown Dallas apartment specials",
    highlight:
      "Compare Uptown Dallas listings by normal rent, estimated effective rent, bedroom type, and current concessions.",
    sections: [
      {
        title: "Find Uptown Dallas apartments with clearer pricing",
        text: "Uptown renters often compare multiple luxury and mid-rise options. Below Market Apartments keeps specials and effective rent visible so the deal is easier to understand.",
      },
      {
        title: "Narrow by floor plan and budget",
        text: "Use price and bedroom filters to focus on the Uptown units that match your actual search instead of scanning every floor plan at every property.",
      },
    ],
    relatedLinks: [
      { label: "Oak Lawn apartments", to: "/apartments/dallas-tx/oak-lawn" },
      { label: "Downtown Dallas apartments", to: "/apartments/dallas-tx/downtown" },
      { label: "Dallas apartment specials", to: "/apartments/dallas-tx/specials" },
    ],
  },
  "uptown-4-weeks-free": {
    title: "Uptown Dallas Apartments With 4 Weeks Free",
    eyebrow: "Uptown 4 weeks free",
    description:
      "Search Uptown Dallas apartments advertising 4 weeks free, one month free, rent credits, effective rent estimates, and live floor plans.",
    searchLabel: "Search Uptown 4 weeks free",
    searchUrl: "/properties?search=Uptown%204%20weeks%20free",
    primaryKeyword: "Uptown Dallas apartments 4 weeks free",
    highlight:
      "Compare Uptown Dallas apartments with 4 weeks free while keeping normal rent, effective rent, floor plans, and fees visible.",
    sections: [
      {
        title: "Compare Uptown specials before touring",
        text: "Uptown apartments can have strong specials, but renters should confirm whether the offer applies to the exact floor plan and lease term.",
      },
      {
        title: "Look at the full monthly picture",
        text: "Estimated effective rent helps compare concessions, while normal rent and fees help renters understand what may actually be due monthly.",
      },
    ],
    relatedLinks: [
      { label: "Uptown Dallas specials", to: "/apartments/dallas-tx/uptown" },
      { label: "4 weeks free apartments", to: "/dallas-apartments-4-weeks-free" },
      { label: "Luxury Dallas specials", to: "/dallas-luxury-apartments-specials" },
    ],
  },
  "medical-district-specials": {
    title: "Medical District Apartments With Specials",
    eyebrow: "Medical District apartment deals",
    description:
      "Search Medical District Dallas apartments with active rent specials, effective rent estimates, floor plans, photos, and nearby commute context.",
    searchLabel: "Search Medical District",
    searchUrl: "/properties?search=Medical%20District",
    primaryKeyword: "Medical District apartments specials",
    highlight:
      "Compare apartments near the Dallas Medical District by active special, normal rent, estimated effective rent, floor plans, and location.",
    sections: [
      {
        title: "Search near hospitals and work centers",
        text: "Medical District renters often care about commute time, floor plan value, and move-in cost. This page keeps specials and effective rent visible while comparing nearby listings.",
      },
      {
        title: "Compare Medical District and Inwood-area deals",
        text: "Use this page to compare apartment specials near Forest Park Road, Inwood Road, UT Southwestern, and nearby Dallas medical employment corridors.",
      },
    ],
    relatedLinks: [
      { label: "Inwood on the Park", to: "/properties/inwood-on-the-park" },
      { label: "Dallas 8 weeks free", to: "/apartments/dallas-tx/8-weeks-free" },
      { label: "North Dallas specials", to: "/north-dallas-apartments-specials" },
    ],
  },
  "turtle-creek-specials": {
    title: "Turtle Creek Apartments With Specials",
    eyebrow: "Turtle Creek apartment deals",
    description:
      "Browse Turtle Creek and Oak Lawn apartments with current rent specials, effective rent estimates, photos, floor plans, and location details.",
    searchLabel: "Search Turtle Creek",
    searchUrl: "/properties?search=Turtle%20Creek",
    primaryKeyword: "Turtle Creek apartments specials",
    highlight:
      "Compare Turtle Creek apartment specials with normal rent, effective rent, property photos, and Oak Lawn location context.",
    sections: [
      {
        title: "Compare Turtle Creek luxury and value",
        text: "Turtle Creek searches can include premium rent ranges, so renters should compare the actual floor plan, special, and monthly fees before touring.",
      },
      {
        title: "Support for Oak Lawn searches",
        text: "This page connects Turtle Creek, Oak Lawn, and central Dallas apartment searches so renters can compare nearby specials from one cluster.",
      },
    ],
    relatedLinks: [
      { label: "Parkview Turtle Creek", to: "/properties/parkview-turtle-creek-by-hanover" },
      { label: "Oak Lawn specials", to: "/oak-lawn-apartments-specials" },
      { label: "Dallas luxury specials", to: "/dallas-luxury-apartments-specials" },
    ],
  },
  "farmers-branch-8-weeks-free": {
    title: "Farmers Branch Apartments With 8 Weeks Free",
    eyebrow: "Farmers Branch 8 weeks free",
    description:
      "Find Farmers Branch apartments advertising 8 weeks free and compare normal rent, effective rent, floor plans, photos, and availability.",
    searchLabel: "Search Farmers Branch 8 weeks free",
    searchUrl: "/properties?search=Farmers%20Branch%208%20weeks%20free",
    primaryKeyword: "Farmers Branch apartments 8 weeks free",
    highlight:
      "Compare Farmers Branch apartments with 8 weeks free while keeping the normal rent, effective rent, and exact floor plan details in view.",
    sections: [
      {
        title: "Target the high-value concession",
        text: "Eight weeks free can create a strong estimated effective rent, but renters should confirm the credit timing and whether it applies to the exact unit.",
      },
      {
        title: "Compare Farmers Branch and Mercer Crossing",
        text: "Use this page for Farmers Branch searches around Luna Road, Mercer Crossing, and nearby North Dallas access points.",
      },
    ],
    relatedLinks: [
      { label: "The Elara", to: "/properties/the-elara" },
      { label: "Farmers Branch specials", to: "/farmers-branch-apartments-specials" },
      { label: "Farmers Branch 6 weeks", to: "/farmers-branch-apartments-6-weeks-free" },
    ],
  },
  "west-dallas-specials": {
    title: "West Dallas Apartments With Specials",
    eyebrow: "West Dallas apartment deals",
    description:
      "Search West Dallas apartments with active specials, rent credits, effective rent estimates, floor plans, photos, and location context.",
    searchLabel: "Search West Dallas",
    searchUrl: "/properties?search=West%20Dallas",
    primaryKeyword: "West Dallas apartments specials",
    highlight:
      "Compare West Dallas apartment specials near Singleton Boulevard, Trinity Groves, and Downtown Dallas access points.",
    sections: [
      {
        title: "Compare West Dallas value",
        text: "West Dallas renters can use this page to compare active specials, floor plan availability, normal rent, and estimated effective rent.",
      },
      {
        title: "Review unique rent credits carefully",
        text: "Some West Dallas offers use rent credits instead of standard weeks-free concessions, so comparing the effective value is especially helpful.",
      },
    ],
    relatedLinks: [
      { label: "Trinity", to: "/properties/trinity-singleton" },
      { label: "Move-in specials", to: "/dallas-apartments-with-move-in-specials" },
      { label: "Downtown Dallas", to: "/apartments/dallas-tx/downtown" },
    ],
  },
  "deep-ellum-specials": {
    title: "Deep Ellum Apartments With Specials",
    eyebrow: "Deep Ellum apartment deals",
    description:
      "Browse Deep Ellum and nearby East Dallas apartments with rent specials, effective rent estimates, photos, floor plans, and location details.",
    searchLabel: "Search Deep Ellum",
    searchUrl: "/properties?search=Deep%20Ellum",
    primaryKeyword: "Deep Ellum apartments specials",
    highlight:
      "Compare Deep Ellum apartment specials with normal rent, effective rent, floor plans, and nearby Dallas location context.",
    sections: [
      {
        title: "Search around Live Oak and central Dallas",
        text: "Deep Ellum renters often compare lifestyle access, commute routes, and active specials. This page keeps the deal details visible while comparing properties.",
      },
      {
        title: "Confirm the exact special before applying",
        text: "Properties may offer weeks free, rent credits, or waived fees. Ask how the concession applies to the exact floor plan and move-in date.",
      },
    ],
    relatedLinks: [
      { label: "Oak & Ellum", to: "/properties/oak-and-ellum" },
      { label: "4 weeks free apartments", to: "/dallas-apartments-4-weeks-free" },
      { label: "Downtown Dallas specials", to: "/apartments/dallas-tx/downtown" },
    ],
  },
  "north-dallas-specials": {
    title: "North Dallas Apartments With Specials",
    eyebrow: "North Dallas apartment deals",
    description:
      "Find North Dallas apartments with active specials, effective rent estimates, photos, floor plans, and renter-friendly deal comparisons.",
    searchLabel: "Search North Dallas",
    searchUrl: "/properties?search=North%20Dallas",
    primaryKeyword: "North Dallas apartments specials",
    highlight:
      "Compare North Dallas apartment specials by normal rent, estimated effective rent, floor plans, fees, and neighborhood fit.",
    sections: [
      {
        title: "Compare value across North Dallas",
        text: "North Dallas searches can include Lake Highlands, Park Lane, Inwood, Medical District, and nearby commute corridors. This page helps compare specials across those areas.",
      },
      {
        title: "Use specials to narrow the list",
        text: "Start with active concessions, then compare floor plans, fees, photos, and location before deciding which apartments are worth touring.",
      },
    ],
    relatedLinks: [
      { label: "Ava Apartment Homes", to: "/properties/ava-apartment-homes" },
      { label: "Medical District specials", to: "/medical-district-apartments-specials" },
      { label: "Dallas move-in specials", to: "/dallas-apartments-with-move-in-specials" },
    ],
  },
  "oak-lawn": {
    title: "Oak Lawn Dallas Apartments With Specials",
    eyebrow: "Oak Lawn apartment deals",
    description:
      "Browse Oak Lawn Dallas apartments with active specials, estimated effective rent, bedroom filters, and transparent deal details.",
    searchLabel: "Search Oak Lawn",
    searchUrl: "/properties?search=Oak%20Lawn%20Dallas",
    primaryKeyword: "Oak Lawn Dallas apartments",
    highlight:
      "See Oak Lawn apartment specials beside normal rent so renters can compare the real value before touring.",
    sections: [
      {
        title: "Compare Oak Lawn apartment deals",
        text: "Use the search page to compare available Oak Lawn properties by rent, specials, beds, and map location.",
      },
      {
        title: "Ask better questions before applying",
        text: "The listing experience keeps fees, special timing, and normal rent in view so renters know what to confirm with the property.",
      },
    ],
    relatedLinks: [
      { label: "Uptown Dallas apartments", to: "/apartments/dallas-tx/uptown" },
      { label: "Victory Park apartments", to: "/apartments/dallas-tx/victory-park" },
      { label: "8 weeks free apartments", to: "/apartments/dallas-tx/8-weeks-free" },
    ],
  },
  "oak-lawn-apartments-specials": {
    title: "Oak Lawn Apartments With Specials",
    eyebrow: "Oak Lawn apartment specials",
    description:
      "Search Oak Lawn and Turtle Creek apartments with current rent specials, effective rent estimates, floor plans, photos, and map-based search.",
    searchLabel: "Search Oak Lawn specials",
    searchUrl: "/properties?search=Oak%20Lawn%20Dallas",
    primaryKeyword: "Oak Lawn apartments specials",
    highlight:
      "Find Oak Lawn apartment specials and compare the current deal against normal rent, floor plans, and nearby Dallas location details.",
    sections: [
      {
        title: "Search Oak Lawn by value",
        text: "Oak Lawn and nearby Turtle Creek renters can compare active specials, rent range, photos, and available bedroom types in one place.",
      },
      {
        title: "Confirm timing before applying",
        text: "Ask whether the special is available for the exact floor plan, lease term, and move-in date you want before submitting an application.",
      },
    ],
    relatedLinks: [
      { label: "Uptown Dallas apartments", to: "/apartments/dallas-tx/uptown" },
      { label: "Dallas apartment specials", to: "/apartments/dallas-tx/specials" },
      { label: "No deposit apartments", to: "/dallas-apartments-no-deposit" },
    ],
  },
  "bishop-arts": {
    title: "Bishop Arts Dallas Apartments With Specials",
    eyebrow: "Bishop Arts apartment search",
    description:
      "Find Bishop Arts Dallas apartments and nearby rent specials with transparent pricing, bedroom filters, and map search.",
    searchLabel: "Search Bishop Arts",
    searchUrl: "/properties?search=Bishop%20Arts%20Dallas",
    primaryKeyword: "Bishop Arts Dallas apartments",
    highlight:
      "Search Bishop Arts and nearby Dallas apartment options by specials, rent range, and available bedroom type.",
    sections: [
      {
        title: "Look beyond the headline rent",
        text: "Compare normal rent, estimated effective rent, and active specials so you can understand what the listing is really offering.",
      },
      {
        title: "Use the map to stay near the area you want",
        text: "The property search map helps renters narrow results around Bishop Arts and nearby neighborhoods without losing deal transparency.",
      },
    ],
    relatedLinks: [
      { label: "Downtown Dallas apartments", to: "/apartments/dallas-tx/downtown" },
      { label: "Dallas apartment specials", to: "/apartments/dallas-tx/specials" },
      { label: "All Dallas apartments", to: "/apartments/dallas-tx" },
    ],
  },
  "victory-park": {
    title: "Victory Park Dallas Apartments With Specials",
    eyebrow: "Victory Park apartment deals",
    description:
      "Search Victory Park Dallas apartments with current rent specials, effective rent estimates, and renter-friendly comparison tools.",
    searchLabel: "Search Victory Park",
    searchUrl: "/properties?search=Victory%20Park%20Dallas",
    primaryKeyword: "Victory Park Dallas apartments",
    highlight:
      "Compare Victory Park apartments by current specials, effective rent, normal rent, and available bedroom ranges.",
    sections: [
      {
        title: "Compare apartments near Victory Park",
        text: "Use filtered results to focus on the floor plans and specials that match your budget before scheduling tours.",
      },
      {
        title: "Keep specials transparent",
        text: "Below Market Apartments highlights specials without hiding the normal rent renters may still owe monthly.",
      },
    ],
    relatedLinks: [
      { label: "Uptown Dallas apartments", to: "/apartments/dallas-tx/uptown" },
      { label: "Oak Lawn apartments", to: "/apartments/dallas-tx/oak-lawn" },
      { label: "Downtown Dallas apartments", to: "/apartments/dallas-tx/downtown" },
    ],
  },
  downtown: {
    title: "Downtown Dallas Apartments With Specials",
    eyebrow: "Downtown Dallas apartment search",
    description:
      "Browse Downtown Dallas apartments with rent specials, effective rent estimates, map search, and bedroom-based filters.",
    searchLabel: "Search Downtown Dallas",
    searchUrl: "/properties?search=Downtown%20Dallas",
    primaryKeyword: "Downtown Dallas apartments",
    highlight:
      "Find Downtown Dallas listings and compare specials with the normal rent, effective rent, and floor-plan details side by side.",
    sections: [
      {
        title: "Search Downtown Dallas by value",
        text: "Use the search experience to compare available apartment deals by price, beds, specials, and map area.",
      },
      {
        title: "Know what to confirm before touring",
        text: "Renters can review estimated effective rent, active specials, and fee questions before deciding which properties are worth a tour.",
      },
    ],
    relatedLinks: [
      { label: "Victory Park apartments", to: "/apartments/dallas-tx/victory-park" },
      { label: "Uptown Dallas apartments", to: "/apartments/dallas-tx/uptown" },
      { label: "Dallas apartment specials", to: "/apartments/dallas-tx/specials" },
    ],
  },
};
const DALLAS_INTERNAL_LINKS = [
  { label: "Dallas apartments", to: "/apartments/dallas-tx" },
  { label: "Dallas apartment specials", to: "/apartments/dallas-tx/specials" },
  { label: "8 weeks free apartments", to: "/apartments/dallas-tx/8-weeks-free" },
  { label: "6 weeks free", to: "/dallas-apartments-6-weeks-free" },
  { label: "4 weeks free", to: "/dallas-apartments-4-weeks-free" },
  { label: "No deposit", to: "/dallas-apartments-no-deposit" },
  { label: "Farmers Branch", to: "/farmers-branch-apartments-specials" },
  { label: "Irving", to: "/irving-apartments-specials" },
  { label: "Luxury specials", to: "/dallas-luxury-apartments-specials" },
  { label: "Move-in specials", to: "/dallas-apartments-with-move-in-specials" },
  { label: "Waived admin fee", to: "/dallas-apartments-waived-admin-fee" },
  { label: "Las Colinas", to: "/las-colinas-apartments-specials" },
  { label: "Farmers Branch 6 weeks", to: "/farmers-branch-apartments-6-weeks-free" },
  { label: "Uptown 4 weeks", to: "/uptown-dallas-apartments-4-weeks-free" },
  { label: "Medical District", to: "/medical-district-apartments-specials" },
  { label: "Turtle Creek", to: "/turtle-creek-apartments-specials" },
  { label: "Farmers Branch 8 weeks", to: "/farmers-branch-apartments-8-weeks-free" },
  { label: "West Dallas", to: "/west-dallas-apartments-specials" },
  { label: "Deep Ellum", to: "/deep-ellum-apartments-specials" },
  { label: "North Dallas", to: "/north-dallas-apartments-specials" },
  { label: "Uptown Dallas", to: "/apartments/dallas-tx/uptown" },
  { label: "Oak Lawn", to: "/oak-lawn-apartments-specials" },
  { label: "Bishop Arts", to: "/apartments/dallas-tx/bishop-arts" },
  { label: "Victory Park", to: "/apartments/dallas-tx/victory-park" },
  { label: "Downtown Dallas", to: "/apartments/dallas-tx/downtown" },
];

export default function DallasSeoLandingPage({ pageKey }) {
  const { pageType = "dallas-tx" } = useParams();
  const currentPageType = pageKey || pageType;
  const page = DALLAS_LANDING_PAGES[currentPageType];
  const [properties, setProperties] = useState([]);
  const [hoveredLandingPropertyId, setHoveredLandingPropertyId] = useState("");

  useEffect(() => {
    if (!page) return;

    const previousTitle = document.title;
    const descriptionMeta = document.querySelector("meta[name='description']");
    const canonicalLink = document.querySelector("link[rel='canonical']");
    const ogTitleMeta = document.querySelector("meta[property='og:title']");
    const ogDescriptionMeta = document.querySelector("meta[property='og:description']");
    const ogUrlMeta = document.querySelector("meta[property='og:url']");
    const twitterTitleMeta = document.querySelector("meta[name='twitter:title']");
    const twitterDescriptionMeta = document.querySelector(
      "meta[name='twitter:description']"
    );
    const previousDescription = descriptionMeta?.getAttribute("content") || "";
    const previousCanonical = canonicalLink?.getAttribute("href") || "";
    const previousOgTitle = ogTitleMeta?.getAttribute("content") || "";
    const previousOgDescription = ogDescriptionMeta?.getAttribute("content") || "";
    const previousOgUrl = ogUrlMeta?.getAttribute("content") || "";
    const previousTwitterTitle = twitterTitleMeta?.getAttribute("content") || "";
    const previousTwitterDescription =
      twitterDescriptionMeta?.getAttribute("content") || "";
    const pageTitle = `${page.title} | Below Market Apartments`;
    const canonicalUrl = `https://belowmarketapartments.com${window.location.pathname}`;

    document.title = pageTitle;
    descriptionMeta?.setAttribute("content", page.description);
    canonicalLink?.setAttribute("href", canonicalUrl);
    ogTitleMeta?.setAttribute("content", pageTitle);
    ogDescriptionMeta?.setAttribute("content", page.description);
    ogUrlMeta?.setAttribute("content", canonicalUrl);
    twitterTitleMeta?.setAttribute("content", pageTitle);
    twitterDescriptionMeta?.setAttribute("content", page.description);

    return () => {
      document.title = previousTitle;
      descriptionMeta?.setAttribute("content", previousDescription);
      canonicalLink?.setAttribute("href", previousCanonical);
      ogTitleMeta?.setAttribute("content", previousOgTitle);
      ogDescriptionMeta?.setAttribute("content", previousOgDescription);
      ogUrlMeta?.setAttribute("content", previousOgUrl);
      twitterTitleMeta?.setAttribute("content", previousTwitterTitle);
      twitterDescriptionMeta?.setAttribute("content", previousTwitterDescription);
    };
  }, [page]);

  useEffect(() => {
    let isMounted = true;

    getAllProperties()
      .then((savedProperties) => {
        if (isMounted) setProperties(savedProperties);
      })
      .catch((error) => {
        console.error(error);
        if (isMounted) setProperties([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!page) {
    return <Navigate to="/apartments/dallas-tx" replace />;
  }

  const pageFaqs = getPageFaqs(page);
  const featuredProperties = getSeoLandingProperties(properties, currentPageType);
  const matchingPropertyCount = getSeoLandingPropertyCount(properties, currentPageType);
  const featuredListingLabel =
    matchingPropertyCount === 1
      ? "1 live match"
      : matchingPropertyCount > SEO_LANDING_PROPERTY_LIMIT
        ? `${SEO_LANDING_PROPERTY_LIMIT} of ${matchingPropertyCount} live matches`
        : `${matchingPropertyCount} live matches`;
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pageFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-[#f5f8f1] text-[#102426]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <header className="border-b border-[#d7e6df] bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#173f3f] text-xs font-black text-[#f2b84b]">
              BMA
            </span>
            <span className="hidden font-black text-[#102426] sm:block">Below Market Apartments</span>
          </Link>
          <Link
            to="/properties?search=Dallas%2C%20TX"
            className="rounded-xl bg-[#f2b84b] px-4 py-2.5 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
          >
            Search Dallas
          </Link>
        </div>
      </header>

      <section className="bma-brand-panel border-b-[5px] border-[#f2b84b] px-4 py-8 text-white md:py-10">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div>
            <p className="w-fit rounded-full bg-[#f2b84b]/15 px-3 py-1.5 text-xs font-black uppercase text-[#f9d783]">
              {page.eyebrow}
            </p>
            <h1 className="mt-4 max-w-4xl text-3xl font-black leading-tight text-[#fff7df] md:text-5xl">
              {page.title}
            </h1>
            <p className="mt-3 max-w-3xl text-base font-semibold leading-7 text-[#d7ece6] md:text-lg">
              {page.description}
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                to={page.searchUrl}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#f2b84b] px-5 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
              >
                <Search className="h-4 w-4" />
                {page.searchLabel}
              </Link>
              <Link
                to="/start"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-black text-white ring-1 ring-white/25 hover:bg-white/15"
              >
                Get matched
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {page.relatedLinks.slice(0, 3).map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white ring-1 ring-white/15 hover:bg-white/15"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 shadow-2xl shadow-[#102426]/20 backdrop-blur">
            <p className="text-xs font-black uppercase text-[#f2b84b]">Search snapshot</p>
            <div className="mt-3 divide-y divide-white/10">
              <LandingSnapshotRow label="Listings" value={featuredListingLabel} />
              <LandingSnapshotRow label="Pricing" value="Normal + special value" />
              <LandingSnapshotRow label="Next step" value="Compare before touring" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-7 md:py-8">
        <section className="rounded-2xl border border-[#d7e6df] bg-white p-4 shadow-sm md:p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-black text-[#1f6f63]">
                Live Dallas listings
              </p>
              <h2 className="mt-1 text-2xl font-black text-[#102426]">
                Apartments currently matching this search
              </h2>
              <p className="mt-1.5 max-w-3xl text-sm font-semibold leading-6 text-[#526260]">
                These live property pages give renters direct access to floor plans, specials, photos, location details, and effective-rent estimates.
              </p>
            </div>

            <Link
              to={page.searchUrl}
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-[#173f3f] px-5 py-3 text-sm font-black text-white hover:bg-[#102426]"
            >
              View all matches
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {featuredProperties.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(300px,36vw)] md:items-start lg:grid-cols-[minmax(0,1fr)_minmax(340px,36vw)] xl:grid-cols-[minmax(0,1fr)_minmax(420px,38vw)]">
              <div className="order-2 min-w-0 md:sticky md:top-24 md:order-1 md:max-h-[calc(100vh-7rem)] md:overflow-y-auto md:overscroll-contain md:pr-1">
                <div className="rounded-xl border border-[#d7e6df] bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-black text-[#102426]">
                        Showing 1-{featuredProperties.length} of {matchingPropertyCount} listings
                      </p>
                      <p className="mt-1 text-xs font-bold text-[#526260]">
                        Limited to {SEO_LANDING_PROPERTY_LIMIT} matching properties per SEO page.
                      </p>
                    </div>
                    <span className="w-fit rounded-full bg-[#f5f8f1] px-3 py-1.5 text-xs font-black text-[#526260] ring-1 ring-[#d7e6df]">
                      {featuredListingLabel}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-4">
                  {featuredProperties.map((property) => (
                    <LandingPropertyCard
                      key={property.id}
                      property={property}
                      isMapHighlighted={hoveredLandingPropertyId === property.id}
                      onMapHover={setHoveredLandingPropertyId}
                    />
                  ))}
                </div>
              </div>

              <LandingListingsMap
                properties={featuredProperties}
                hoveredPropertyId={hoveredLandingPropertyId}
                onPropertyHover={setHoveredLandingPropertyId}
              />
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-[#f5f8f1] p-5">
              <p className="text-sm font-bold text-[#526260]">
                Live matches are being refreshed. Use the search page to view all available Dallas properties and current specials.
              </p>
            </div>
          )}
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <InfoCard
            title={page.primaryKeyword}
            text={page.highlight}
            isFeatured
          />
          {page.sections.map((section) => (
            <InfoCard key={section.title} title={section.title} text={section.text} />
          ))}
        </div>

        <div className="mt-6 grid gap-5 rounded-2xl border border-[#d7e6df] bg-white p-5 shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-black text-[#1f6f63]">How renters use this page</p>
            <h2 className="mt-2 text-2xl font-black text-[#102426]">
              Start broad, then narrow by real unit details.
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-[#526260]">
              Search results can be filtered by rent, beds, specials, and map area. The property cards update their pricing to match the selected bedroom and price filters so renters are not comparing the wrong unit type.
            </p>
          </div>

          <div className="grid gap-3">
            {[
              "Search Dallas listings and current specials.",
              "Use bedroom and price filters to narrow matching units.",
              "Check normal rent, effective rent, fees, and special details.",
              "Request help from a locator when a deal looks worth touring.",
            ].map((step) => (
              <div key={step} className="flex gap-3 rounded-2xl bg-[#f5f8f1] p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#1f6f63]" />
                <p className="text-sm font-bold leading-6 text-[#102426]">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <section className="mt-8 border-t border-[#d7e6df] pt-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-black text-[#1f6f63]">
                Renter deal guide
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#102426]">
                What to know before comparing {page.primaryKeyword}.
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#526260]">
                Quick answers about specials, normal rent, effective value, and fees before a renter chooses which properties are worth touring.
              </p>
            </div>

            <div className="flex max-w-3xl flex-wrap gap-2">
              {DALLAS_INTERNAL_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#173f3f] ring-1 ring-[#d7e6df] hover:bg-[#edf4ef]"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {pageFaqs.map((faq) => (
              <SeoFaqCard
                key={faq.question}
                question={faq.question}
                answer={faq.answer}
              />
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-col justify-between gap-4 rounded-3xl bg-[#173f3f] p-6 text-white md:flex-row md:items-center">
          <div>
            <p className="text-sm font-black text-[#f2b84b]">Related searches</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {page.relatedLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white ring-1 ring-white/15 hover:bg-white/15"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <Link
            to={page.searchUrl}
            className="inline-flex w-fit items-center gap-2 rounded-2xl bg-[#f2b84b] px-5 py-3 text-sm font-black text-[#102426] hover:bg-[#f9d783]"
          >
            Browse matching properties
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function getPageFaqs(page) {
  return [
    {
      question: `How should renters compare ${page.primaryKeyword}?`,
      answer:
        "Compare normal rent, estimated effective rent, bedroom type, active special, and required fees together. A lower effective value is helpful, but renters should confirm the actual monthly amount due before applying.",
    },
    {
      question: "Do weeks-free specials lower the monthly payment?",
      answer:
        "Not always. Many properties apply the special as an account credit, upfront credit, or concession across the lease. The renter may still owe normal rent plus required monthly fees each month.",
    },
    {
      question: "Why does the listing show both normal rent and effective rent?",
      answer:
        "Normal rent shows the rent basis before the special. Effective rent estimates the value of the special across the lease so renters can compare deals without confusing it with the actual monthly bill.",
    },
    {
      question: "What should renters ask before touring?",
      answer:
        "Ask if the special is active for the exact unit, whether it applies to base rent only, how the credit is applied, what fees are required, and whether the unit is still available.",
    },
  ];
}

function SeoFaqCard({ question, answer }) {
  return (
    <article className="rounded-2xl border border-[#d7e6df] bg-white p-4 shadow-sm">
      <h3 className="text-sm font-black leading-5 text-[#102426]">{question}</h3>
      <p className="mt-2 text-xs font-semibold leading-5 text-[#526260]">
        {answer}
      </p>
    </article>
  );
}

function LandingPropertyCard({ property, isMapHighlighted, onMapHover }) {
  const address = getPropertyAddressLabel(property);
  const special = getPropertySpecialLabel(property);
  const price = property.effectiveRent || property.startingRent || property.rent || "Contact for pricing";
  const bedroomLabel = Array.isArray(property.bedrooms) && property.bedrooms.length > 0
    ? property.bedrooms.join(" - ")
    : getFloorPlanBedroomSummary(property);

  return (
    <article
      onMouseEnter={() => onMapHover?.(property.id)}
      onMouseLeave={() => onMapHover?.("")}
      onFocus={() => onMapHover?.(property.id)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          onMapHover?.("");
        }
      }}
      className={`overflow-hidden rounded-xl bg-white shadow-sm ring-1 transition duration-200 ease-out hover:-translate-y-1 hover:ring-2 hover:ring-[#f2b84b] hover:shadow-[0_18px_42px_rgba(16,36,38,0.14)] md:grid md:grid-cols-[172px_minmax(0,1fr)] ${
        isMapHighlighted ? "ring-2 ring-[#f2b84b] shadow-[0_18px_42px_rgba(16,36,38,0.14)]" : "ring-[#d7e6df]"
      }`}
    >
      <Link
        to={`/properties/${property.id}`}
        className="relative block h-56 overflow-hidden bg-[#dcebe4] md:h-full md:min-h-[190px]"
      >
        <img
          src={getPropertyPrimaryImage(property)}
          alt={property.name}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover transition duration-300 hover:scale-105"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-black uppercase text-[#1f6f63] shadow-sm ring-1 ring-[#d7e6df]">
          {special ? "Special" : "Live"}
        </span>
      </Link>

      <div className="min-w-0 p-4">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-[#1f6f63]">
              {special ? "Current special" : "Live listing"}
            </p>
            <h3 className="mt-1 truncate text-xl font-black text-[#102426]">
              {property.name}
            </h3>
            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-semibold leading-5 text-[#526260]">
              <MapPin className="h-4 w-4 shrink-0 text-[#1f6f63]" />
              <span className="truncate">{address || "Dallas, TX"}</span>
            </p>
          </div>
          <Link
            to={`/properties/${property.id}`}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#173f3f] px-4 py-2.5 text-sm font-black text-white hover:bg-[#102426]"
          >
            View
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <SeoPropertyMetric label="Price" value={price} />
          <SeoPropertyMetric label="Beds" value={bedroomLabel || "Floor plans"} />
          <SeoPropertyMetric label="Special" value={special || "Ask leasing"} />
        </div>

        {special && (
          <p className="mt-3 truncate rounded-lg bg-[#fff8e6] px-3 py-2 text-xs font-black text-[#8a5b0a] ring-1 ring-[#f2d08a]">
            {special}
          </p>
        )}
      </div>
    </article>
  );
}

function SeoPropertyMetric({ label, value }) {
  return (
    <div className="min-w-0 rounded-lg bg-[#f5f8f1] px-3 py-2 ring-1 ring-[#d7e6df]">
      <p className="text-[11px] font-black uppercase text-[#526260]">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-[#102426]">{value}</p>
    </div>
  );
}

function LandingListingsMap({ properties, hoveredPropertyId, onPropertyHover }) {
  const pins = properties.map((property, index) => ({
    property,
    position: getLandingMapPinPosition(property, index),
  }));
  const hoveredProperty = properties.find(
    (property) => property.id === hoveredPropertyId
  );

  return (
    <aside className="order-1 md:sticky md:top-24 md:order-2">
      <div className="overflow-hidden rounded-xl border border-[#d7e6df] bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-[#d7e6df] px-4 py-3">
          <div>
            <p className="text-sm font-black text-[#102426]">Map view</p>
            <p className="text-xs font-bold text-[#526260]">
              Hover a property to see its map dot.
            </p>
          </div>
          <span className="rounded-full bg-[#e7f3ee] px-3 py-1 text-xs font-black text-[#1f6f63]">
            {properties.length} pins
          </span>
        </div>

        <div className="relative h-[340px] overflow-hidden bg-[#dcebe4] sm:h-[420px] md:h-[calc(100vh-7rem)] md:min-h-[360px] md:max-h-[640px]">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,63,63,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(23,63,63,0.08)_1px,transparent_1px)] bg-[size:74px_74px]" />
          <div className="absolute left-[-12%] top-[52%] h-10 w-[130%] -rotate-6 bg-white/85 shadow-sm" />
          <div className="absolute left-[20%] top-[-8%] h-[125%] w-12 rotate-12 bg-white/75 shadow-sm" />
          <div className="absolute left-[56%] top-[-10%] h-[130%] w-8 -rotate-[24deg] bg-[#f6f0d8]/90 shadow-sm" />
          <div className="absolute left-[-12%] top-[26%] h-8 w-[125%] rotate-[18deg] bg-[#f6f0d8]/90 shadow-sm" />
          <div className="absolute left-[68%] top-[9%] h-28 w-40 rounded-[32px] border border-[#a9cfc2] bg-[#c4dfd6]/80" />
          <div className="absolute bottom-[12%] right-[7%] h-32 w-56 rounded-[36px] border border-[#a9cfc2] bg-[#c4dfd6]/70" />

          <div className="absolute right-4 top-4 z-10 rounded-xl bg-white/95 px-3 py-2 text-xs font-black text-[#173f3f] shadow-sm ring-1 ring-[#d7e6df]">
            Dallas area
          </div>

          {pins.map(({ property, position }) => {
            const isHighlighted = hoveredPropertyId === property.id;

            return (
              <Link
                key={property.id}
                to={`/properties/${property.id}`}
                onMouseEnter={() => onPropertyHover?.(property.id)}
                onMouseLeave={() => onPropertyHover?.("")}
                onFocus={() => onPropertyHover?.(property.id)}
                onBlur={() => onPropertyHover?.("")}
                className={`absolute z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 shadow-[0_8px_18px_rgba(16,36,38,0.24)] ring-2 ring-white transition ${
                  isHighlighted
                    ? "scale-125 border-[#102426] bg-[#f2b84b]"
                    : "border-white bg-[#173f3f] hover:scale-110 hover:bg-[#f2b84b]"
                }`}
                style={{ left: position.left, top: position.top }}
                aria-label={`View ${property.name}`}
                title={property.name}
              >
                <span className="h-2 w-2 rounded-full bg-white/90" />
              </Link>
            );
          })}

          {hoveredProperty && (
            <div className="absolute bottom-3 left-3 z-30 max-w-[min(17rem,calc(100%-1.5rem))] rounded-xl bg-white p-3 shadow-xl ring-1 ring-[#d7e6df]">
              <p className="truncate text-sm font-black text-[#102426]">
                {hoveredProperty.name}
              </p>
              <p className="mt-1 truncate text-xs font-bold text-[#526260]">
                {getPropertyAddressLabel(hoveredProperty)}
              </p>
              {getPropertySpecialLabel(hoveredProperty) && (
                <p className="mt-2 truncate rounded-lg bg-[#fff8e6] px-2 py-1.5 text-[11px] font-black text-[#8a5b0a] ring-1 ring-[#f2d08a]">
                  {getPropertySpecialLabel(hoveredProperty)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function getLandingMapPinPosition(property, index) {
  const coordinates = getLandingPropertyCoordinates(property);

  if (coordinates) {
    const dallasBounds = {
      minLatitude: 32.66,
      maxLatitude: 32.96,
      minLongitude: -96.98,
      maxLongitude: -96.62,
    };
    const left =
      ((coordinates.longitude - dallasBounds.minLongitude) /
        (dallasBounds.maxLongitude - dallasBounds.minLongitude)) *
      100;
    const top =
      ((dallasBounds.maxLatitude - coordinates.latitude) /
        (dallasBounds.maxLatitude - dallasBounds.minLatitude)) *
      100;

    return {
      left: `${clampMapPosition(left, 8, 92)}%`,
      top: `${clampMapPosition(top, 10, 90)}%`,
    };
  }

  const fallbackPositions = [
    { left: "46%", top: "45%" },
    { left: "58%", top: "38%" },
    { left: "40%", top: "58%" },
    { left: "64%", top: "58%" },
    { left: "34%", top: "36%" },
    { left: "52%", top: "70%" },
  ];

  return fallbackPositions[index % fallbackPositions.length];
}

function getLandingPropertyCoordinates(property) {
  const latitude = Number(property.latitude || property.lat);
  const longitude = Number(property.longitude || property.lng);

  if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
    return { latitude, longitude };
  }

  if (Array.isArray(property.coordinates) && property.coordinates.length >= 2) {
    const [coordinateLongitude, coordinateLatitude] = property.coordinates.map(Number);

    if (Number.isFinite(coordinateLatitude) && Number.isFinite(coordinateLongitude)) {
      return {
        latitude: coordinateLatitude,
        longitude: coordinateLongitude,
      };
    }
  }

  return null;
}

function clampMapPosition(value, minValue, maxValue) {
  if (!Number.isFinite(value)) return minValue;

  return Math.min(maxValue, Math.max(minValue, value));
}

function LandingSnapshotRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <p className="text-xs font-black uppercase text-[#d7ece6]">{label}</p>
      <p className="text-right text-sm font-black text-white">{value}</p>
    </div>
  );
}

function getSeoLandingPropertyCount(properties, pageType) {
  return properties
    .filter((property) => property.status === "Live")
    .filter((property) => matchesLandingPage(property, pageType)).length;
}

function getSeoLandingProperties(properties, pageType) {
  return properties
    .filter((property) => property.status === "Live")
    .filter((property) => matchesLandingPage(property, pageType))
    .sort((firstProperty, secondProperty) => {
      const firstHasSpecial = getPropertySpecialLabel(firstProperty) ? 1 : 0;
      const secondHasSpecial = getPropertySpecialLabel(secondProperty) ? 1 : 0;

      return secondHasSpecial - firstHasSpecial;
    })
    .slice(0, SEO_LANDING_PROPERTY_LIMIT);
}

function matchesLandingPage(property, pageType) {
  const haystack = [
    property.name,
    property.address,
    property.city,
    property.neighborhood,
    property.area,
    property.propertyClass,
    property.assetClass,
    property.benchmarkClass,
    property.managementCompany,
    property.special,
    property.description,
    ...(property.amenities || []),
    ...(property.communityAmenities || []),
    ...(property.apartmentAmenities || []),
    ...(property.unitFeatures || []),
    ...(property.floorPlans || []).flatMap((floorPlan) => [
      floorPlan.name,
      floorPlan.beds,
      floorPlan.bedrooms,
      floorPlan.adminFeeSpecial,
      floorPlan.special?.label,
      floorPlan.special?.adminFeeSpecial,
      floorPlan.currentSpecial,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (pageType === "8-weeks-free") {
    return /8\s*weeks|eight\s*weeks/.test(haystack);
  }

  if (pageType === "6-weeks-free") {
    return /6\s*weeks|six\s*weeks/.test(haystack);
  }

  if (pageType === "4-weeks-free") {
    return /4\s*weeks|four\s*weeks|1\s*month|one\s*month/.test(haystack);
  }

  if (pageType === "no-deposit") {
    return /no\s*deposit|zero\s*deposit|\$0\s*deposit|0\s*deposit|deposit\s*waiv|waiv\w*\s+deposit/.test(haystack);
  }

  if (pageType === "waived-admin-fee") {
    return /waiv\w*.*(admin|application|app).*fee|(admin|application|app).*fee.*waiv|credited\s+back|fee\s+credit/.test(haystack);
  }

  if (pageType === "move-in-specials") {
    return Boolean(getPropertySpecialLabel(property));
  }

  if (pageType === "dallas-luxury-specials") {
    const hasSpecial = Boolean(getPropertySpecialLabel(property));
    const hasLuxurySignal = /luxury|class\s*a|high[-\s]?rise|penthouse|concierge|resort|skyline|premium/.test(haystack);

    return hasSpecial && (hasLuxurySignal || haystack.includes("uptown") || haystack.includes("turtle creek") || haystack.includes("victory park"));
  }

  if (pageType === "farmers-branch-6-weeks-free") {
    return (
      (haystack.includes("farmers branch") || haystack.includes("mercer crossing")) &&
      /6\s*weeks|six\s*weeks/.test(haystack)
    );
  }

  if (pageType === "farmers-branch-8-weeks-free") {
    return (
      (haystack.includes("farmers branch") || haystack.includes("mercer crossing") || haystack.includes("luna")) &&
      /8\s*weeks|eight\s*weeks/.test(haystack)
    );
  }

  if (pageType === "uptown-4-weeks-free") {
    return haystack.includes("uptown") && /4\s*weeks|four\s*weeks|1\s*month|one\s*month/.test(haystack);
  }

  if (pageType === "specials") {
    return Boolean(getPropertySpecialLabel(property));
  }

  const areaKeywords = {
    uptown: ["uptown"],
    "oak-lawn": ["oak lawn", "turtle creek"],
    "oak-lawn-apartments-specials": ["oak lawn", "turtle creek"],
    "bishop-arts": ["bishop arts", "oak cliff"],
    "victory-park": ["victory park"],
    downtown: ["downtown"],
    "farmers-branch-specials": ["farmers branch", "mercer crossing"],
    "irving-specials": ["irving", "las colinas"],
    "las-colinas-specials": ["las colinas", "irving"],
    "medical-district-specials": ["medical district", "forest park", "inwood", "ut southwestern", "medical"],
    "turtle-creek-specials": ["turtle creek", "oak lawn"],
    "west-dallas-specials": ["west dallas", "singleton", "trinity groves"],
    "deep-ellum-specials": ["deep ellum", "live oak", "east dallas"],
    "north-dallas-specials": ["north dallas", "skillman", "park lane", "lake highlands", "inwood", "medical district"],
  };
  const keywords = areaKeywords[pageType];

  if (keywords) {
    return keywords.some((keyword) => haystack.includes(keyword));
  }

  return haystack.includes("dallas") || property.state === "TX";
}

function getPropertySpecialLabel(property) {
  return (
    property.special ||
    (property.floorPlans || [])
      .map((floorPlan) => floorPlan.special?.label || floorPlan.currentSpecial)
      .find(Boolean) ||
    ""
  );
}

function getFloorPlanBedroomSummary(property) {
  const bedrooms = [
    ...new Set(
      (property.floorPlans || [])
        .map((floorPlan) => floorPlan.beds || floorPlan.bedrooms)
        .filter(Boolean)
    ),
  ];

  if (bedrooms.length === 0) return "";
  if (bedrooms.length === 1) return bedrooms[0];

  return `${bedrooms[0]} - ${bedrooms[bedrooms.length - 1]}`;
}

function InfoCard({ title, text, isFeatured = false }) {
  return (
    <article
      className={`rounded-3xl border p-6 shadow-sm ${
        isFeatured
          ? "border-[#f2d08a] bg-[#fff8e6]"
          : "border-[#d7e6df] bg-white"
      }`}
    >
      <p className="text-sm font-black text-[#1f6f63]">{title}</p>
      <p className="mt-3 text-sm font-semibold leading-6 text-[#526260]">{text}</p>
    </article>
  );
}
