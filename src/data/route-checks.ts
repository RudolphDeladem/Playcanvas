// Representative destination journeys across Legon, checked by scripts/route-tests.mjs and
// listed in the geography inspector (/geo/) so they can be ridden from above.
// maxLength: a generous ceiling (metres) for the ride; a detour beyond it means routing went wrong.

export interface RouteCheck {
  from: string;
  to: string;
  maxLength: number;
  /** what the way should look like, in words */
  expect: string;
}

export const ROUTE_CHECKS: RouteCheck[] = [
  { from: 'Legon Main Entrance', to: 'University Square', maxLength: 900, expect: 'In through the Main Gate and west along the avenue to the square at the fountain.' },
  { from: 'Mensah Sarbah Hall', to: 'Great Hall', maxLength: 2300, expect: 'Out of the Sarbah porters\' lodge drive, north to the avenue and up Legon Hill to the Convocation courtyard.' },
  { from: 'University of Ghana Business School', to: 'University Square', maxLength: 700, expect: 'From the UGBS car park round to the square on the avenue.' },
  { from: 'Night Market', to: 'Legon Main Entrance', maxLength: 2200, expect: 'North from the market past the halls to the avenue and east to the Main Gate.' },
  { from: 'Legon Main Entrance', to: 'The Balme Library', maxLength: 900, expect: 'In through the Main Gate, west along the avenue, ending on the forecourt road in front of the library (south side, facing the fountain).' },
  { from: 'Legon Main Entrance', to: 'Great Hall', maxLength: 2300, expect: 'The avenue west past the Balme fountain and Commonwealth Hall, up the axial road on Legon Hill to its loop, then on foot across the Convocation courtyard to the Great Hall\'s east front.' },
  { from: 'The Balme Library', to: 'University Square', maxLength: 150, expect: 'Out of the library front straight onto the square: a few dozen metres.' },
  { from: 'University Square', to: 'Night Market', maxLength: 1400, expect: 'South across the avenue past the halls to the market frontage on Jubilee Link.' },
  { from: 'Great Hall', to: 'University of Ghana banking square', maxLength: 2400, expect: 'Down Legon Hill and south to the Banking Square car park, arriving facing the banks.' },
  { from: 'School of Engineering Sciences', to: 'The Balme Library', maxLength: 1000, expect: 'From the engineering school to the library front, not the road behind it.' },
  { from: 'The Balme Library', to: 'Commonwealth Hall', maxLength: 1200, expect: 'West along the avenue to the foot of Legon Hill; on foot between the gate houses and up the stairway to the gate in the front block (riders and taxis take the drive round to the forecourt).' },
  { from: 'Commonwealth Hall', to: 'Great Hall', maxLength: 1200, expect: 'From the hall up the axial road to the Convocation courtyard and the Great Hall\'s east front.' },
  { from: 'Akuafo Hall Main', to: 'Night Market', maxLength: 1100, expect: 'Out of the Akuafo gatehouse forecourt onto the avenue, then south past Sarbah and Valco to the north end of the market.' },
  { from: 'University of Ghana Botanical Gardens', to: 'University Square', maxLength: 2600, expect: 'Out of the gardens by their main entrance road, through the gardens on the paved drive, not the woodland trails.' },
  { from: 'Mensah Sarbah Hall', to: 'Central Cafeteria, CC', maxLength: 300, expect: 'From the Sarbah porters\' lodge to the CC right in front of it.' },
  { from: 'Volta Hall', to: 'The Balme Library', maxLength: 600, expect: 'A short ride east to the library front.' },
  { from: 'Legon Main Entrance', to: 'University of Ghana Sports Stadium', maxLength: 2200, expect: 'Through campus to the stadium in the south-east.' },
  { from: 'International Students Hostel 1, ISH 1', to: 'Night Market', maxLength: 600, expect: 'The hostel and the market are neighbours.' },
  { from: 'Dr. Hilla Limann Hall', to: 'Alexander Kwapong Hall', maxLength: 250, expect: 'Front door to front door: Limann and Kwapong face each other across their car parks.' },
  { from: 'Jean Nelson Aka Hall', to: 'Elizabeth Frances Sey Hall', maxLength: 250, expect: 'Front door to front door: JNA and Sey face each other across their car parks.' },
  { from: 'International Students Hostel 2, ISH 2', to: 'Jubilee Hall', maxLength: 400, expect: 'From the canopy on ISH 2\'s south facade past the car park to Jubilee\'s portico in its south-east corner.' },
  { from: 'Jubilee Hall', to: 'International Students Hostel 1, ISH 1', maxLength: 300, expect: 'From Jubilee\'s portico across the car park to the gabled porch on ISH 1\'s north facade.' },
  { from: 'Night Market', to: 'Consolidated Bank Ghana (near Night Market)', maxLength: 500, expect: 'From the market north to the banking square, ending at the CBG door on the compound\'s south side.' },
  { from: 'Jubilee Hall', to: 'Ecobank (near Night Market)', maxLength: 900, expect: 'From Jubilee\'s portico to the Ecobank door in the north notch of the Union Building.' },
  { from: 'Mensah Sarbah Hall', to: 'Mensah Sarbah Vikings Hostel', maxLength: 700, expect: 'From the Sarbah porters\' lodge to the VIKINGS HOSTEL entrance block in the inner corner of the L, from the car park.' },
  { from: 'The Balme Library', to: 'School of Law', maxLength: 1200, expect: 'Into the law courtyard from the road on the east, ending at the steps up to the round entrance building.' },
  { from: 'School of Law', to: 'School of Engineering Sciences', maxLength: 600, expect: 'Along the road south of the engineering school, then down the hill on the access road to the porch.' },
  { from: 'School of Law', to: 'International House', maxLength: 400, expect: 'Across the law-school road to the car park west of International House and its entrance porch.' },
  { from: 'School of Engineering Sciences', to: 'Pent Admin Block', maxLength: 700, expect: 'East to Old Pent, ending at the admin block\'s gabled porch on its north face, between Dar es Salaam and Kampala courts.' },
  { from: 'New Pent Block A', to: 'Nairobi Court', maxLength: 600, expect: 'From Block A\'s pavilion south to the road along Old Pent, east to the porch on Nairobi Court\'s north face.' },
  { from: 'Elizabeth Frances Sey Hall', to: 'Jones Quartey Building, JQB', maxLength: 3200, expect: 'From the southern halls (leaving by the Sey frontage) north to JQB by the Main Gate.' },
];
