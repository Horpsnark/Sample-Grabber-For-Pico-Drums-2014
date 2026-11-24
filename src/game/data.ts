import {
  GameState,
  ItemKey,
  LogEntry,
  Phase,
  RealShow,
  Song,
  VenueState,
} from './types';

export const TOUR: Array<[number, string, string]> = [
  [1965, "Big Nig's House (Acid Test)~San Jose, CA", "Fillmore Auditorium (Acid Test)~San Francisco, CA"],
  [1966, "Longshoremen's Hall (Trips Festival)~San Francisco, CA", "Avalon Ballroom~San Francisco, CA"],
  [1967, "Human Be-In, Golden Gate Park~San Francisco, CA", "Monterey International Pop Festival~Monterey, CA"],
  [1968, "Carousel Ballroom~San Francisco, CA", "Fillmore East~New York, NY"],
  [1969, "Woodstock~Bethel, NY", "Fillmore West~San Francisco, CA"],
  [1970, "Fillmore East~New York, NY", "Capitol Theatre~Port Chester, NY"],
  [1971, "Winterland Arena~San Francisco, CA", "Fillmore East~New York, NY"],
  [1972, "Lyceum Theatre (Europe '72)~London, UK", "Old Renaissance Faire Grounds~Veneta, OR"],
  [1973, "Watkins Glen Raceway~Watkins Glen, NY", "RFK Stadium~Washington, DC"],
  [1974, "Winterland Arena (Wall of Sound)~San Francisco, CA", "Alexandra Palace~London, UK"],
  [1975, "Great American Music Hall~San Francisco, CA", "Kezar Stadium~San Francisco, CA"],
  [1976, "Orpheum Theatre~San Francisco, CA", "Boston Music Hall~Boston, MA"],
  [1977, "Barton Hall, Cornell~Ithaca, NY", "Winterland Arena~San Francisco, CA"],
  [1978, "Red Rocks Amphitheatre~Morrison, CO", "Sound and Light Theatre, Pyramids~Giza, Egypt"],
  [1979, "Madison Square Garden~New York, NY", "The Spectrum~Philadelphia, PA"],
  [1980, "Warfield Theatre~San Francisco, CA", "Radio City Music Hall~New York, NY"],
  [1981, "Rainbow Theatre~London, UK", "Hampton Coliseum~Hampton, VA"],
  [1982, "Greek Theatre~Berkeley, CA", "Madison Square Garden~New York, NY"],
  [1983, "Red Rocks Amphitheatre~Morrison, CO", "Madison Square Garden~New York, NY"],
  [1984, "Greek Theatre~Berkeley, CA", "Hampton Coliseum~Hampton, VA"],
  [1985, "Alpine Valley Music Theatre~East Troy, WI", "Greek Theatre~Berkeley, CA"],
  [1986, "Oakland Coliseum Arena~Oakland, CA", "Hampton Coliseum~Hampton, VA"],
  [1987, "Giants Stadium (with Dylan)~East Rutherford, NJ", "Autzen Stadium (with Dylan)~Eugene, OR"],
  [1988, "Shoreline Amphitheatre~Mountain View, CA", "Madison Square Garden~New York, NY"],
  [1989, "Alpine Valley Music Theatre~East Troy, WI", "Giants Stadium~East Rutherford, NJ"],
  [1990, "Oakland Coliseum Arena~Oakland, CA", "Madison Square Garden~New York, NY"],
  [1991, "Giants Stadium~East Rutherford, NJ", "Boston Garden~Boston, MA"],
  [1992, "Soldier Field~Chicago, IL", "Knickerbocker Arena~Albany, NY"],
  [1993, "Shoreline Amphitheatre~Mountain View, CA", "Deer Creek Music Center~Noblesville, IN"],
  [1994, "Madison Square Garden~New York, NY", "Shoreline Amphitheatre~Mountain View, CA"],
  [1995, "Deer Creek Music Center~Noblesville, IN", "Soldier Field~Chicago, IL"],
];

export const V: Array<[string, string, number]> = [];
TOUR.forEach(([y, a, b]) => {
  [a, b].forEach((s) => {
    const [p, c] = s.split('~');
    V.push([p, c, y]);
  });
});

export const inf = (stopIndex: number): number =>
  0.25 + (0.75 * (V[stopIndex][2] - 1965)) / 30;

export const lotf = (stopIndex: number): number =>
  V[stopIndex][2] < 1980
    ? 0.35
    : Math.min(1, 0.35 + (V[stopIndex][2] - 1979) * 0.1);

export const c$ = (n: number, stopIndex: number): number =>
  Math.max(2, Math.round(n * inf(stopIndex)));

const DEB: Record<string, number> = {};
(
  [
    [65, "Mindbender"],
    [66, "Dupree's Diamond Blues|Cream Puff War|The Golden Road|Caution|You Don't Have to Ask"],
    [67, "Dark Star|Mountains of the Moon|The Other One"],
    [68, "St. Stephen|China Cat Sunflower|Cryptical Envelopment|Alligator|Doin' That Rag|Rosemary"],
    [69, "Cosmic Charlie|Easy Wind|Mason's Children|Uncle John's Band|Black Peter|New Speedway Boogie|Casey Jones"],
    [71, "Sugaree|Wharf Rat|Greatest Story Ever Told|Loser|Brown-Eyed Women|Mexicali Blues|Tennessee Jed|Jack Straw|Deal|Playing in the Band|Mr. Charlie|Bird Song|Row Jimmy"],
    [72, "Black-Throated Wind|Looks Like Rain|He's Gone|Cassidy"],
    [73, "Stella Blue|Eyes of the World|China Doll|Weather Report Suite|Let It Grow|Unbroken Chain|Wave to the Wind"],
    [66, "Cold Rain and Snow|Beat It On Down the Line|Good Lovin'|Not Fade Away|New Minglewood Blues|Morning Dew|Turn On Your Lovelight|Me and My Uncle|Around and Around|I Know You Rider"],
    [68, "Dancing in the Street|Drums"],
    [69, "Mama Tried|Hard to Handle|High Time"],
    [71, "One More Saturday Night|El Paso|Johnny B. Goode"],
    [73, "They Love Each Other"],
    [77, "Supplication"],
    [71, "Promised Land|Sing Me Back Home|Big River"],
    [73, "Loose Lucy|Here Comes Sunshine|Nobody's Fault But Mine|Mountain Jam"],
    [68, "Space"],
    [76, "Samson and Delilah"],
    [86, "Black Muddy River"],
    [87, "When I Paint My Masterpiece"],
    [92, "So Many Roads"],
    [93, "Corrina"],
    [94, "Lazy River Road|Childhood's End|Samba in the Rain|Little Red Rooster"],
    [71, "I Need a Miracle|Ramble On Rose"],
    [77, "Iko Iko"],
    [78, "Sunrise|Ollin Arageed"],
    [66, "It's All Over Now"],
    [66, "Standing on the Corner|I Know It's a Sin|Sick & Tired|Tastebud|Silver Threads & Golden Needles"],
    [77, "Funiculi Funicula"],
    [85, "Keep On Growing|Dear Mr. Fantasy"],
    [71, "Dark Hollow|I Second That Emotion|The Rub"],
    [73, "Wave That Flag|It Takes a Lot to Laugh, It Takes a Train to Cry|That's All Right"],
    [91, "Way to Go Home"],
    [92, "Gloria|The Same Thing|Broken Arrow"],
    [87, "Maggie's Farm|The Last Time|The Mighty Quinn"],
    [93, "Lucy in the Sky with Diamonds|Liberty"],
    [94, "If the Shoe Fits|It's All Too Much"],
    [87, "All Along the Watchtower|Queen Jane Approximately"],
    [88, "Let the Good Times Roll"],
    [83, "Gimme Some Lovin'"],
    [66, "Spoonful"],
    [83, "My Brother Esau|Revolution"],
    [78, "Werewolves of London"],
    [77, "Jack-A-Roe"],
    [80, "On the Road Again|Heaven Help the Fool|The Race Is On|Big Railroad Blues|Little Sadie|The Monkey and the Engineer"],
    [67, "New Potato Caboose|Feedback"],
    [68, "Spanish Jam|The Eleven"],
    [70, "Katie Mae|Deep Elem Blues"],
    [79, "Alabama Getaway|Big Boss Man"],
    [71, "The Wheel|Me and Bobby McGee"],
    [66, "Don't Ease Me In|Sitting on Top of the World|In the Midnight Hour|Viola Lee Blues|Smokestack Lightning|Good Morning Little School Girl|It's All Over Now, Baby Blue|C.C. Rider|Hurts Me Too|Wang Dang Doodle"],
    [67, "Peggy-O"],
    [76, "Mystery Train"],
    [77, "Stagger Lee"],
    [85, "Hey Pocky Way|I Ain't Superstitious|Keep Your Day Job|Down in the Bottom|Big Boy Pete"],
    [86, "Tangled Up in Blue|Desolation Row|Knockin' on Heaven's Door|Blow Away"],
    [87, "Tom Thumb's Blues|Memphis Blues Again"],
    [88, "Visions of Johanna|Just a Little Light"],
    [89, "Maybe You Know"],
    [70, "To Lay Me Down|Black Queen"],
    [72, "Comes a Time"],
    [78, "Easy to Love You"],
    [80, "Never Trust a Woman"],
    [81, "Rubin and Cherise"],
    [72, "Next Time You See Me|The Stranger (Two Souls in Communion)"],
    [66, "Chinatown Shuffle"],
    [89, "Man Smart, Woman Smarter"],
    [74, "It Must Have Been the Roses|U.S. Blues|Seastones|Ship of Fools"],
    [75, "Stronger Than Dirt|Sage and Spirit|Sand Castles & Glass Camels|Unusual Occurrences in the Desert"],
    [66, "Goin' Down the Road Feeling Bad"],
    [73, "Mississippi Half-Step Uptown Toodeloo"],
    [69, "And We Bid You Good Night"],
    [86, "Tons of Steel"],
    [86, "When Push Comes to Shove"],
    [87, "Walkin' Blues"],
    [71, "Might as Well"],
    [91, "The Weight"],
    [74, "Scarlet Begonias"],
    [75, "Blues for Allah|King Solomon's Marbles|Help on the Way|Slipknot!|Crazy Fingers|The Music Never Stopped|Franklin's Tower"],
    [76, "Lazy Lightning"],
    [77, "Fire on the Mountain|Estimated Prophet|Terrapin Station|Passenger"],
    [78, "Shakedown Street"],
    [79, "Althea|Lost Sailor|Saint of Circumstance"],
    [80, "Feel Like a Stranger|Far from Me"],
    [82, "Touch of Grey|Throwing Stones"],
    [83, "Hell in a Bucket|West L.A. Fadeaway"],
    [87, "Standing on the Moon|Victim or the Crime"],
    [89, "Foolish Heart|Built to Last"],
    [90, "Picasso Moon|Easy Answers"],
    [93, "Days Between|Day Job"],
  ] as Array<[number, string]>
).forEach(([y, s]) =>
  s.split('|').forEach((n) => {
    DEB[n] = 1900 + y;
  })
);

const mk = (s: string, t: 1 | 2 | 3 | 4): Song[] =>
  s.split('|').map((n) => ({ n, t, y: DEB[n] || 1970 }));

export const SONGS: Song[] = [
  ...mk("Truckin'|Sugar Magnolia|Playing in the Band|Jack Straw|The Other One|Scarlet Begonias|Fire on the Mountain|Eyes of the World|Casey Jones|Friend of the Devil|Uncle John's Band|Brown-Eyed Women|Tennessee Jed|Loser|Bertha|Deal|Althea|Touch of Grey|Estimated Prophet|Terrapin Station|Franklin's Tower|Cassidy|Bird Song|China Cat Sunflower|Dark Star|Black Peter|Row Jimmy|Looks Like Rain|Mexicali Blues|Cumberland Blues", 1),
  ...mk("Ripple|Box of Rain|Attics of My Life|Sugaree|Wharf Rat|St. Stephen|Help on the Way|Slipknot!|He's Gone|Stella Blue|China Doll|Crazy Fingers|Throwing Stones|Hell in a Bucket|West L.A. Fadeaway|Shakedown Street|Passenger|Candyman|Dire Wolf|Mason's Children|Greatest Story Ever Told|Born Cross-Eyed|New Speedway Boogie|Brokedown Palace|Black-Throated Wind|Cryptical Envelopment|Saint of Circumstance|Lost Sailor|Victim or the Crime|Foolish Heart|Built to Last|Standing on the Moon|Feel Like a Stranger|Let It Grow|Weather Report Suite", 2),
  ...mk("Dupree's Diamond Blues|Mindbender|Cream Puff War|The Golden Road|Alligator|Caution|Easy Wind|Mr. Charlie|Mountains of the Moon|Doin' That Rag|Cosmic Charlie|Rosemary|Till the Morning Comes|Operator|Days Between|Unbroken Chain|Blues for Allah|King Solomon's Marbles|The Music Never Stopped|Far from Me|Lazy Lightning|Picasso Moon|You Don't Have to Ask|Wave to the Wind|Day Job|Easy Answers", 3),
  ...mk("Cold Rain and Snow|Beat It On Down the Line|Good Lovin'|Not Fade Away|New Minglewood Blues|Morning Dew|Turn On Your Lovelight|Me and My Uncle|Around and Around|I Know You Rider|Dancing in the Street|Drums|Mama Tried|Hard to Handle|High Time|One More Saturday Night|El Paso|Johnny B. Goode|They Love Each Other|Supplication|Promised Land|Sing Me Back Home|Big River|Loose Lucy|Here Comes Sunshine|Nobody's Fault But Mine|Mountain Jam|Little Red Rooster|Lazy River Road|When I Paint My Masterpiece|Childhood's End|Samson and Delilah|So Many Roads|Samba in the Rain|Corrina|Space|Black Muddy River|Ramble On Rose|Iko Iko|I Need a Miracle|It's All Over Now|Sunrise|Ollin Arageed|It Must Have Been the Roses|Stronger Than Dirt|Sage and Spirit|Goin' Down the Road Feeling Bad|U.S. Blues|Sand Castles & Glass Camels|Unusual Occurrences in the Desert|Seastones|Mississippi Half-Step Uptown Toodeloo|And We Bid You Good Night|Tons of Steel|When Push Comes to Shove|Walkin' Blues|Might as Well|Ship of Fools|The Weight|Next Time You See Me|The Stranger (Two Souls in Communion)|Chinatown Shuffle|Man Smart, Woman Smarter|Alabama Getaway|The Wheel|Me and Bobby McGee|Don't Ease Me In|Sitting on Top of the World|In the Midnight Hour|Viola Lee Blues|Smokestack Lightning|Good Morning Little School Girl|It's All Over Now, Baby Blue|C.C. Rider|Hurts Me Too|Wang Dang Doodle|Peggy-O|Mystery Train|Stagger Lee|Big Boss Man|Hey Pocky Way|I Ain't Superstitious|Keep Your Day Job|Down in the Bottom|Big Boy Pete|Tangled Up in Blue|Desolation Row|Knockin' on Heaven's Door|Blow Away|Tom Thumb's Blues|Memphis Blues Again|Visions of Johanna|Just a Little Light|Maybe You Know|To Lay Me Down|Black Queen|Comes a Time|Easy to Love You|Never Trust a Woman|Rubin and Cherise|Standing on the Corner|I Know It's a Sin|Sick & Tired|Tastebud|Silver Threads & Golden Needles|New Potato Caboose|Spanish Jam|Feedback|The Eleven|Katie Mae|Deep Elem Blues|Funiculi Funicula|Werewolves of London|Jack-A-Roe|On the Road Again|Heaven Help the Fool|The Race Is On|Big Railroad Blues|Little Sadie|The Monkey and the Engineer|My Brother Esau|Revolution|Keep On Growing|Dear Mr. Fantasy|All Along the Watchtower|Let the Good Times Roll|Queen Jane Approximately|Gimme Some Lovin'|Spoonful|Way to Go Home|Gloria|Maggie's Farm|The Last Time|The Same Thing|Lucy in the Sky with Diamonds|If the Shoe Fits|Broken Arrow|It's All Too Much|The Mighty Quinn|Liberty|Dark Hollow|I Second That Emotion|The Rub|Wave That Flag|It Takes a Lot to Laugh, It Takes a Train to Cry|That's All Right", 4),
];

export const REAL: Record<string, RealShow> = {
  "1975|Kezar Stadium": { d: "Mar 23, 1975 (SNACK benefit, first show after the hiatus began; Merl Saunders and Ned Lagin sit in)", s: [["The set", ["Blues for Allah", "Stronger Than Dirt", "Drums", "Stronger Than Dirt", "Blues for Allah"]], ["Encore", ["Johnny B. Goode"]]] },
  "1971|Fillmore East": { d: "Apr 29, 1971 (fifth night of the run)", s: [["Set 1", ["Truckin'", "Bertha", "Hurts Me Too", "Cumberland Blues", "Me and My Uncle", "Bird Song", "Playing in the Band", "Loser", "Dark Hollow", "Hard to Handle", "Ripple", "Me and Bobby McGee", "Casey Jones"]], ["Set 2", ["Morning Dew", "New Minglewood Blues", "Sugar Magnolia", "Black Peter", "Beat It On Down the Line", "I Second That Emotion", "Alligator", "Drums", "Alligator", "Goin' Down the Road Feeling Bad", "Cold Rain and Snow", "China Cat Sunflower", "I Know You Rider", "Greatest Story Ever Told", "Johnny B. Goode"]], ["Encores", ["Uncle John's Band", "In the Midnight Hour", "And We Bid You Good Night"]]] },
  "1971|Winterland Arena": { d: "May 30, 1971 (first set from an audience tape only)", s: [["Set 1", ["Bertha", "Me and Bobby McGee", "The Rub", "Loser", "Playing in the Band", "Next Time You See Me", "Morning Dew", "Promised Land", "Good Lovin'"]], ["Set 2", ["China Cat Sunflower", "I Know You Rider", "Sugar Magnolia", "Cumberland Blues", "Big Boss Man", "Me and My Uncle", "Deal", "Truckin'", "Turn On Your Lovelight", "Uncle John's Band", "Casey Jones"]], ["Encore", ["Johnny B. Goode"]]] },
  "1973|RFK Stadium": { d: "Jun 10, 1973 (with the Allman Brothers on the bill)", s: [["Set 1", ["Morning Dew", "Beat It On Down the Line", "Ramble On Rose", "Jack Straw", "Wave That Flag", "Looks Like Rain", "Box of Rain", "They Love Each Other", "The Race Is On", "Row Jimmy", "El Paso", "Bird Song", "Playing in the Band"]], ["Set 2", ["Eyes of the World", "Stella Blue", "Big River", "Here Comes Sunshine", "Around and Around", "Dark Star", "He's Gone", "Wharf Rat", "Truckin'", "Sugar Magnolia"]], ["Third set (with Dickey Betts and Butch Trucks)", ["It Takes a Lot to Laugh, It Takes a Train to Cry", "That's All Right", "Promised Land", "Not Fade Away", "Goin' Down the Road Feeling Bad", "Drums", "Not Fade Away", "Johnny B. Goode"]]] },
  "1990|Oakland Coliseum Arena": { d: "Dec 27, 1990 (Hamza El Din joins the drums)", s: [["Set 1", ["Jack Straw", "Sugaree", "New Minglewood Blues", "It Must Have Been the Roses", "Queen Jane Approximately", "Loose Lucy", "Cassidy", "Don't Ease Me In"]], ["Set 2", ["Scarlet Begonias", "Fire on the Mountain", "Estimated Prophet", "Comes a Time", "Drums", "Space", "I Need a Miracle", "The Wheel", "Throwing Stones", "Turn On Your Lovelight"]], ["Encore", ["It's All Over Now, Baby Blue"]]] },
  "1991|Boston Garden": { d: "Sep 26, 1991", s: [["Set 1", ["Jack Straw", "Cold Rain and Snow", "Wang Dang Doodle", "Candyman", "Mexicali Blues", "Cumberland Blues", "Picasso Moon", "Box of Rain"]], ["Set 2", ["Dark Star", "Saint of Circumstance", "Eyes of the World", "Drums", "Space", "The Other One", "Dark Star", "Attics of My Life", "Good Lovin'"]], ["Encore", ["Brokedown Palace", "And We Bid You Good Night"]]] },
  "1992|Soldier Field": { d: "Jun 25, 1992 (Steve Miller sits in on the encore)", s: [["Set 1", ["Bertha", "Greatest Story Ever Told", "West L.A. Fadeaway", "Me and My Uncle", "Big River", "Ramble On Rose", "When I Paint My Masterpiece", "Brown-Eyed Women", "The Music Never Stopped"]], ["Set 2", ["Good Morning Little School Girl", "Way to Go Home", "Saint of Circumstance", "He's Gone", "Drums", "Space", "The Wheel", "So Many Roads", "All Along the Watchtower", "Turn On Your Lovelight"]], ["Encore", ["Gloria"]]] },
  "1992|Knickerbocker Arena": { d: "Jun 12, 1992", s: [["Set 1", ["Jack Straw", "Sugaree", "Mexicali Blues", "Maggie's Farm", "Brown-Eyed Women", "Black-Throated Wind", "New Speedway Boogie", "Promised Land"]], ["Set 2", ["Scarlet Begonias", "Fire on the Mountain", "Way to Go Home", "Truckin'", "Smokestack Lightning", "Drums", "Space", "The Last Time", "China Doll", "Sugar Magnolia"]], ["Encore", ["Attics of My Life"]]] },
  "1993|Shoreline Amphitheatre": { d: "Aug 25, 1993", s: [["Set 1", ["Touch of Grey", "Greatest Story Ever Told", "Peggy-O", "The Same Thing", "Friend of the Devil", "Easy Answers", "So Many Roads", "Promised Land"]], ["Set 2", ["Scarlet Begonias", "Fire on the Mountain", "Estimated Prophet", "Terrapin Station", "Drums", "Space", "All Along the Watchtower", "Attics of My Life", "Sugar Magnolia"]], ["Encore", ["Lucy in the Sky with Diamonds"]]] },
  "1993|Deer Creek Music Center": { d: "Jun 22, 1993", s: [["Set 1", ["Help on the Way", "Slipknot!", "Franklin's Tower", "Wang Dang Doodle", "High Time", "It's All Over Now", "Tom Thumb's Blues", "Tennessee Jed", "Picasso Moon"]], ["Set 2", ["Victim or the Crime", "Crazy Fingers", "Looks Like Rain", "He's Gone", "Drums", "I Need a Miracle", "Days Between", "Johnny B. Goode"]], ["Encore", ["Liberty"]]] },
  "1994|Madison Square Garden": { d: "Oct 19, 1994 (the last Garden show; Jerry joins on drums)", s: [["Set 1", ["Feel Like a Stranger", "Bertha", "Spoonful", "Jack-A-Roe", "El Paso", "If the Shoe Fits", "Bird Song"]], ["Set 2", ["Samson and Delilah", "So Many Roads", "Saint of Circumstance", "Terrapin Station", "Drums", "Space", "Way to Go Home", "Stella Blue", "Sugar Magnolia"]], ["Encore", ["Brokedown Palace"]]] },
  "1994|Shoreline Amphitheatre": { d: "Jul 3, 1994", s: [["Set 1", ["Here Comes Sunshine", "It's All Over Now", "Althea", "When I Paint My Masterpiece", "Bird Song", "Promised Land"]], ["Set 2", ["Samson and Delilah", "Eyes of the World", "Fire on the Mountain", "Box of Rain", "Terrapin Station", "Drums", "Space", "Corrina", "Days Between", "Good Lovin'"]], ["Encore", ["Liberty"]]] },
  "1995|Deer Creek Music Center": { d: "Jul 2, 1995 (the gate-crasher show)", s: [["Set 1", ["Here Comes Sunshine", "Walkin' Blues", "Dire Wolf", "It's All Over Now", "Broken Arrow", "Desolation Row", "Tennessee Jed", "Let It Grow"]], ["Set 2", ["Scarlet Begonias", "Fire on the Mountain", "Victim or the Crime", "It's All Too Much", "New Speedway Boogie", "Drums", "Space", "Attics of My Life", "Sugar Magnolia"]], ["Encore", ["The Mighty Quinn"]]] },
  "1987|Autzen Stadium (with Dylan)": { d: "Jul 19, 1987 (Dead sets only; Dylan's own set not counted)", s: [["Set 1", ["Iko Iko", "Feel Like a Stranger", "Franklin's Tower", "New Minglewood Blues", "Peggy-O", "When I Paint My Masterpiece", "West L.A. Fadeaway", "Let It Grow"]], ["Set 2", ["Gimme Some Lovin'", "Playing in the Band", "He's Gone", "Spoonful", "Drums", "Space", "The Wheel", "Truckin'", "Wharf Rat", "Turn On Your Lovelight"]], ["Encore (with Dylan)", ["Touch of Grey", "All Along the Watchtower"]]] },
  "1988|Shoreline Amphitheatre": { d: "Sep 30, 1988", s: [["Set 1", ["Iko Iko", "Walkin' Blues", "Stagger Lee", "Me and My Uncle", "Big River", "When Push Comes to Shove", "Let It Grow"]], ["Set 2", ["Bertha", "Playing in the Band", "Terrapin Station", "Drums", "Space", "The Wheel", "All Along the Watchtower", "Black Peter", "Sugar Magnolia"]], ["Encore", ["U.S. Blues"]]] },
  "1988|Madison Square Garden": { d: "Sep 14, 1988", s: [["Set 1", ["Let the Good Times Roll", "Alabama Getaway", "Greatest Story Ever Told", "Stagger Lee", "Walkin' Blues", "It Must Have Been the Roses", "Queen Jane Approximately", "Ramble On Rose", "Let It Grow"]], ["Set 2", ["Box of Rain", "Victim or the Crime", "Foolish Heart", "Looks Like Rain", "He's Gone", "Drums", "Space", "I Need a Miracle", "Gimme Some Lovin'", "Morning Dew"]], ["Encore", ["Black Muddy River"]]] },
  "1989|Alpine Valley Music Theatre": { d: "Jul 19, 1989", s: [["Set 1", ["Hell in a Bucket", "Sugaree", "Mama Tried", "Mexicali Blues", "Althea", "Victim or the Crime", "West L.A. Fadeaway", "Desolation Row", "Deal"]], ["Set 2", ["Box of Rain", "Foolish Heart", "Looks Like Rain", "Terrapin Station", "Drums", "Space", "The Other One", "The Wheel", "Morning Dew"]], ["Encore", ["Turn On Your Lovelight"]]] },
  "1989|Giants Stadium": { d: "Jul 10, 1989", s: [["Set 1", ["Feel Like a Stranger", "Franklin's Tower", "Walkin' Blues", "Jack-A-Roe", "When I Paint My Masterpiece", "Tennessee Jed", "The Music Never Stopped", "Don't Ease Me In"]], ["Set 2", ["Foolish Heart", "Just a Little Light", "Playing in the Band", "Uncle John's Band", "Drums", "Space", "Iko Iko", "All Along the Watchtower", "Morning Dew", "Sugar Magnolia"]], ["Encore", ["Knockin' on Heaven's Door"]]] },
  "1984|Hampton Coliseum": { d: "Apr 13, 1984", s: [["Set 1", ["Keep Your Day Job", "New Minglewood Blues", "Dire Wolf", "Beat It On Down the Line", "West L.A. Fadeaway", "It's All Over Now", "Bird Song", "Hell in a Bucket", "Don't Ease Me In"]], ["Set 2", ["Scarlet Begonias", "Fire on the Mountain", "Estimated Prophet", "Drums", "The Wheel", "Truckin'", "Goin' Down the Road Feeling Bad", "Around and Around", "Good Lovin'"]], ["Encore", ["U.S. Blues"]]] },
  "1984|Greek Theatre": { d: "Jul 13, 1984", s: [["Set 1", ["Bertha", "Greatest Story Ever Told", "Dire Wolf", "C.C. Rider", "Loser", "Cassidy", "Dupree's Diamond Blues", "Hell in a Bucket", "Might as Well"]], ["Set 2", ["Scarlet Begonias", "Touch of Grey", "Fire on the Mountain", "Man Smart, Woman Smarter", "Drums", "Space", "The Wheel", "I Need a Miracle", "Stella Blue", "Sugar Magnolia"]], ["Encore", ["Dark Star"]]] },
  "1985|Alpine Valley Music Theatre": { d: "Jun 22, 1985", s: [["Set 1", ["Hell in a Bucket", "Sugaree", "Walkin' Blues", "Candyman", "It's All Over Now", "Althea", "Cassidy", "Brown-Eyed Women", "One More Saturday Night"]], ["Set 2", ["Keep On Growing", "Mississippi Half-Step Uptown Toodeloo", "Lost Sailor", "Saint of Circumstance", "Drums", "Space", "Dear Mr. Fantasy", "I Need a Miracle", "Stella Blue", "Throwing Stones", "Not Fade Away"]], ["Encore", ["Brokedown Palace"]]] },
  "1985|Greek Theatre": { d: "Jun 16, 1985 (Cryptical Envelopment returns after 13 years)", s: [["Set 1", ["In the Midnight Hour", "Bertha", "Walkin' Blues", "Tennessee Jed", "My Brother Esau", "Big Railroad Blues", "Looks Like Rain", "Mississippi Half-Step Uptown Toodeloo", "Promised Land"]], ["Set 2", ["Scarlet Begonias", "Fire on the Mountain", "Samson and Delilah", "Cryptical Envelopment", "The Other One", "Cryptical Envelopment", "Drums", "Space", "Goin' Down the Road Feeling Bad", "I Need a Miracle", "Wharf Rat", "Turn On Your Lovelight"]], ["Encore", ["Brokedown Palace"]]] },
  "1986|Oakland Coliseum Arena": { d: "Dec 15, 1986 (first show after Jerry's coma)", s: [["Set 1", ["Touch of Grey", "C.C. Rider", "When Push Comes to Shove", "Beat It On Down the Line", "Greatest Story Ever Told", "Loser", "Cassidy", "Althea", "My Brother Esau", "Candyman", "Let It Grow"]], ["Set 2", ["Iko Iko", "Looks Like Rain", "Black Muddy River", "Playing in the Band", "Terrapin Station", "Drums", "Space", "Truckin'", "Wharf Rat", "Playing in the Band", "Good Lovin'"]], ["Encore", ["Johnny B. Goode"]]] },
  "1986|Hampton Coliseum": { d: "Mar 20, 1986", s: [["Set 1", ["Touch of Grey", "Little Red Rooster", "Friend of the Devil", "It's All Over Now", "Row Jimmy", "Me and My Uncle", "Mexicali Blues", "Althea", "Box of Rain"]], ["Set 2", ["Iko Iko", "Estimated Prophet", "Eyes of the World", "Drums", "Wharf Rat", "Throwing Stones", "Not Fade Away"]], ["Encore", ["U.S. Blues"]]] },
  "1981|Rainbow Theatre": { d: "Mar 23, 1981", s: [["Set 1", ["Jack Straw", "They Love Each Other", "Cassidy", "It Must Have Been the Roses", "El Paso", "Ramble On Rose", "New Minglewood Blues", "Sugaree", "Lazy Lightning", "Supplication"]], ["Set 2", ["Bird Song", "Samson and Delilah", "To Lay Me Down", "Terrapin Station", "Playing in the Band", "Drums", "The Other One", "Stella Blue", "Sugar Magnolia"]], ["Encore", ["Casey Jones"]]] },
  "1982|Greek Theatre": { d: "May 22, 1982", s: [["Set 1", ["Jack Straw", "Sugaree", "Cassidy", "Tennessee Jed", "New Minglewood Blues", "Cumberland Blues", "Lazy Lightning", "Supplication", "Deal"]], ["Set 2", ["China Cat Sunflower", "I Know You Rider", "Man Smart, Woman Smarter", "Never Trust a Woman", "Lost Sailor", "Saint of Circumstance", "He's Gone", "Drums", "Space", "Not Fade Away", "Wharf Rat", "Around and Around", "Good Lovin'"]], ["Encore", ["U.S. Blues"]]] },
  "1982|Madison Square Garden": { d: "Sep 20, 1982", s: [["Set 1", ["Shakedown Street", "New Minglewood Blues", "Candyman", "El Paso", "Dupree's Diamond Blues", "It's All Over Now", "Never Trust a Woman", "Row Jimmy", "Throwing Stones", "Keep Your Day Job"]], ["Set 2", ["Scarlet Begonias", "Fire on the Mountain", "Man Smart, Woman Smarter", "Terrapin Station", "Drums", "Space", "Truckin'", "The Other One", "Stella Blue", "Sugar Magnolia"]], ["Encore", ["Touch of Grey"]]] },
  "1983|Red Rocks Amphitheatre": { d: "Sep 6, 1983", s: [["Set 1", ["Alabama Getaway", "Greatest Story Ever Told", "Peggy-O", "Hell in a Bucket", "Dupree's Diamond Blues", "New Minglewood Blues", "Bird Song", "Lazy Lightning", "Supplication", "Might as Well"]], ["Set 2", ["Help on the Way", "Slipknot!", "Franklin's Tower", "Playing in the Band", "Drums", "Space", "Uncle John's Band", "Playing in the Band", "Throwing Stones", "Not Fade Away"]], ["Encore", ["Brokedown Palace"]]] },
  "1983|Madison Square Garden": { d: "Oct 12, 1983", s: [["Set 1", ["Cold Rain and Snow", "New Minglewood Blues", "Ramble On Rose", "My Brother Esau", "It Must Have Been the Roses", "Cassidy", "Cumberland Blues", "Looks Like Rain", "Might as Well"]], ["Set 2", ["Help on the Way", "Slipknot!", "Franklin's Tower", "Man Smart, Woman Smarter", "He's Gone", "Drums", "Space", "Truckin'", "Black Peter", "Not Fade Away"]], ["Encore", ["Revolution"]]] },
  "1979|Madison Square Garden": { d: "Sep 5, 1979", s: [["Set 1", ["Mississippi Half-Step Uptown Toodeloo", "Franklin's Tower", "Mama Tried", "Mexicali Blues", "Peggy-O", "Cassidy", "Loser", "Promised Land"]], ["Set 2", ["Scarlet Begonias", "Fire on the Mountain", "Estimated Prophet", "Eyes of the World", "Drums", "Space", "Black Peter", "I Need a Miracle", "Bertha", "Good Lovin'"]], ["Encore", ["U.S. Blues"]]] },
  "1979|The Spectrum": { d: "Nov 6, 1979", s: [["Set 1", ["Alabama Getaway", "Promised Land", "Tennessee Jed", "Me and My Uncle", "Mexicali Blues", "Candyman", "Easy to Love You", "Looks Like Rain", "Jack-A-Roe", "Jack Straw", "Deal"]], ["Set 2", ["Terrapin Station", "Playing in the Band", "Drums", "Space", "Black Peter", "Good Lovin'"]], ["Encore", ["U.S. Blues"]]] },
  "1980|Warfield Theatre": { d: "Oct 13, 1980 (acoustic set plus two electric sets)", s: [["Acoustic set", ["On the Road Again", "Bird Song", "El Paso", "To Lay Me Down", "Heaven Help the Fool", "Jack-A-Roe", "The Race Is On", "Deep Elem Blues", "Ripple"]], ["Electric set 1", ["Sugaree", "New Minglewood Blues", "Peggy-O", "C.C. Rider", "Big Railroad Blues", "Lazy Lightning", "Supplication", "Deal"]], ["Electric set 2", ["Cold Rain and Snow", "Samson and Delilah", "Ship of Fools", "Lost Sailor", "Saint of Circumstance", "Drums", "Space", "He's Gone", "The Other One", "Stella Blue", "Around and Around", "Johnny B. Goode"]], ["Encore", ["Casey Jones"]]] },
  "1980|Radio City Music Hall": { d: "Oct 31, 1980 (Halloween, filmed for Dead Ahead)", s: [["Acoustic set", ["Heaven Help the Fool", "Sage and Spirit", "Little Sadie", "The Monkey and the Engineer", "It Must Have Been the Roses", "Cassidy", "Bird Song", "Ripple"]], ["Electric set 1", ["Jack Straw", "Cold Rain and Snow", "Me and My Uncle", "Mexicali Blues", "Ramble On Rose", "Little Red Rooster", "Brown-Eyed Women", "Looks Like Rain", "Deal"]], ["Electric set 2", ["Don't Ease Me In", "Lost Sailor", "Saint of Circumstance", "Franklin's Tower", "Drums", "Space", "Fire on the Mountain", "Not Fade Away", "Stella Blue", "Goin' Down the Road Feeling Bad", "Good Lovin'"]], ["Encore", ["Uncle John's Band"]]] },
  "1978|Red Rocks Amphitheatre": { d: "Jul 8, 1978 (widely considered one of their greatest shows)", s: [["Set 1", ["Bertha", "Good Lovin'", "Dire Wolf", "El Paso", "It Must Have Been the Roses", "New Minglewood Blues", "Ramble On Rose", "Promised Land", "Deal"]], ["Set 2", ["Samson and Delilah", "Ship of Fools", "Estimated Prophet", "The Other One", "Eyes of the World", "Drums", "Space", "Wharf Rat", "Franklin's Tower", "Sugar Magnolia"]], ["Encore", ["Terrapin Station", "One More Saturday Night", "Werewolves of London"]]] },
  "1976|Orpheum Theatre": { d: "Jul 17, 1976 (Dave's Picks 18; encore order approximate)", s: [["Set 1", ["Promised Land", "Mississippi Half-Step Uptown Toodeloo", "Mama Tried", "Deal", "New Minglewood Blues", "Peggy-O", "Big River", "Sugaree", "Johnny B. Goode"]], ["Set 2", ["Samson and Delilah", "Comes a Time", "Drums", "The Other One", "Eyes of the World", "The Other One", "Goin' Down the Road Feeling Bad", "One More Saturday Night"]], ["Encore", ["U.S. Blues", "Not Fade Away"]]] },
  "1977|Winterland Arena": { d: "Dec 31, 1977 (New Year's Eve)", s: [["Set 1", ["The Music Never Stopped", "Tennessee Jed", "Funiculi Funicula", "Me and My Uncle", "Loser", "Jack Straw", "Friend of the Devil", "Lazy Lightning", "Supplication"]], ["Set 2", ["Sugar Magnolia", "Scarlet Begonias", "Fire on the Mountain", "Truckin'", "Wharf Rat", "Drums", "Not Fade Away", "Around and Around"]], ["Encore", ["One More Saturday Night", "Casey Jones"]]] },
  "1966|Avalon Ballroom": { d: "May 19, 1966", s: [["Set 1", ["Beat It On Down the Line", "Standing on the Corner", "Mindbender", "Hurts Me Too", "Viola Lee Blues", "I Know You Rider", "I Know It's a Sin", "Sick & Tired", "Cream Puff War"]], ["Set 2", ["Sitting on Top of the World", "New Minglewood Blues", "Cold Rain and Snow", "Tastebud", "Silver Threads & Golden Needles", "It's All Over Now, Baby Blue", "Good Lovin'", "You Don't Have to Ask"]]] },
  "1967|Human Be-In, Golden Gate Park": { d: "Jan 14, 1967 (only part of the set is documented)", s: [["Documented part", ["Viola Lee Blues", "Good Morning Little School Girl"]]] },
  "1967|Monterey International Pop Festival": { d: "Jun 18, 1967 (setlist partly uncertain)", s: [["Set", ["Cold Rain and Snow", "Viola Lee Blues", "Alligator", "Caution"]]] },
  "1968|Carousel Ballroom": { d: "Feb 14, 1968", s: [["Set 1", ["Good Morning Little School Girl", "Dark Star", "China Cat Sunflower", "The Eleven", "Turn On Your Lovelight"]], ["Set 2", ["Cryptical Envelopment", "The Other One", "Cryptical Envelopment", "New Potato Caboose", "Born Cross-Eyed", "Spanish Jam", "Alligator", "Caution", "Feedback"]], ["Encore", ["In the Midnight Hour"]]] },
  "1968|Fillmore East": { d: "Jun 14, 1968 (early and late shows)", s: [["Both shows", ["Feedback", "The Eleven", "St. Stephen", "Alligator", "Turn On Your Lovelight", "Caution", "Drums", "Caution", "Feedback"]]] },
  "1969|Fillmore West": { d: "Feb 27, 1969 (recorded for Live/Dead)", s: [["Set 1", ["Good Morning Little School Girl", "Doin' That Rag", "Cryptical Envelopment", "Drums", "The Other One", "Cryptical Envelopment"]], ["Set 2", ["Dupree's Diamond Blues", "Mountains of the Moon", "Dark Star", "St. Stephen", "The Eleven", "Turn On Your Lovelight"]], ["Encore", ["Cosmic Charlie"]]] },
  "1970|Capitol Theatre": { d: "Mar 20, 1970 (first Friend of the Devil)", s: [["Electric set", ["Casey Jones", "Me and My Uncle", "China Cat Sunflower", "I Know You Rider", "Hard to Handle"]], ["Acoustic set", ["Deep Elem Blues", "Friend of the Devil", "Don't Ease Me In", "Black Peter", "Uncle John's Band", "Katie Mae"]], ["Electric set 2", ["Good Lovin'", "Not Fade Away", "Drums", "Good Lovin'", "Viola Lee Blues", "High Time", "Turn On Your Lovelight"]], ["Encore", ["And We Bid You Good Night"]]] },
  "1974|Alexandra Palace": { d: "Sep 9, 1974 (from a single source)", s: [["Set 1", ["Bertha", "Promised Land", "It Must Have Been the Roses", "Jack Straw", "Scarlet Begonias", "Mexicali Blues", "Row Jimmy", "Playing in the Band"]], ["Set 2", ["Deal", "El Paso", "Ship of Fools", "Tennessee Jed", "Truckin'", "Wharf Rat", "Uncle John's Band", "Johnny B. Goode"]], ["Encore", ["U.S. Blues", "One More Saturday Night"]]] },
  "1976|Boston Music Hall": { d: "Jun 9, 1976", s: [["Set 1", ["Cold Rain and Snow", "Cassidy", "Scarlet Begonias", "The Music Never Stopped", "Crazy Fingers", "Big River", "They Love Each Other", "Looks Like Rain", "Ship of Fools", "Promised Land"]], ["Set 2", ["St. Stephen", "Eyes of the World", "Let It Grow", "Drums", "Brown-Eyed Women", "Lazy Lightning", "Supplication", "High Time", "Samson and Delilah", "It Must Have Been the Roses", "Dancing in the Street", "Wharf Rat", "Around and Around"]], ["Encore", ["Franklin's Tower"]]] },
  "1981|Hampton Coliseum": { d: "May 1, 1981", s: [["Set 1", ["Alabama Getaway", "Promised Land", "Friend of the Devil", "Me and My Uncle", "Big River", "Althea", "Little Red Rooster", "Tennessee Jed", "Let It Grow", "Deal"]], ["Set 2", ["Feel Like a Stranger", "Franklin's Tower", "Lost Sailor", "Saint of Circumstance", "He's Gone", "The Other One", "Drums", "Space", "The Wheel", "Wharf Rat", "Sugar Magnolia"]], ["Encore", ["U.S. Blues"]]] },
  "1972|Lyceum Theatre (Europe '72)": { d: "May 26, 1972 (last show of Europe ’72; later-set order approximate)", s: [["Set 1", ["Promised Land", "Sugaree", "Mr. Charlie", "Black-Throated Wind", "Loser", "Next Time You See Me", "El Paso", "Dire Wolf", "The Stranger (Two Souls in Communion)", "Playing in the Band"]], ["Set 2 and encore", ["He's Gone", "Jack Straw", "Chinatown Shuffle", "Truckin'", "Not Fade Away", "Drums", "The Other One", "Morning Dew", "Sing Me Back Home", "Me and My Uncle", "Ramble On Rose", "Sugar Magnolia", "Casey Jones", "One More Saturday Night"]]] },
  "1990|Madison Square Garden": { d: "Sep 20, 1990", s: [["Set 1", ["Feel Like a Stranger", "Althea", "It's All Over Now", "Ramble On Rose", "El Paso", "Brown-Eyed Women", "Greatest Story Ever Told", "U.S. Blues"]], ["Set 2", ["Truckin'", "China Cat Sunflower", "I Know You Rider", "Man Smart, Woman Smarter", "Drums", "Space", "Dark Star", "Playing in the Band", "Dark Star", "Throwing Stones", "Touch of Grey"]], ["Encore", ["Turn On Your Lovelight"]]] },
  "1975|Great American Music Hall": { d: "Aug 13, 1975 (One From the Vault)", s: [["The show", ["Help on the Way", "Slipknot!", "Franklin's Tower", "The Music Never Stopped", "It Must Have Been the Roses", "Eyes of the World", "Drums", "King Solomon's Marbles", "Stronger Than Dirt", "Around and Around", "Sugaree", "Big River", "Crazy Fingers", "The Other One", "Sage and Spirit", "Goin' Down the Road Feeling Bad", "U.S. Blues", "Blues for Allah", "Sand Castles & Glass Camels", "Unusual Occurrences in the Desert"]]] },
  "1974|Winterland Arena (Wall of Sound)": { d: "Oct 20, 1974 (last show before the hiatus)", s: [["Set 1", ["Cold Rain and Snow", "Mama Tried", "Deal", "Beat It On Down the Line", "Loser", "Jack Straw", "Tennessee Jed", "El Paso", "Brokedown Palace", "China Cat Sunflower", "I Know You Rider", "Around and Around"]], ["Set 2", ["Seastones", "Playing in the Band", "Drums", "Not Fade Away", "Drums", "The Other One", "Wharf Rat", "Playing in the Band"]], ["Set 3", ["Good Lovin'", "It Must Have Been the Roses", "Promised Land", "Eyes of the World", "Stella Blue", "Sugar Magnolia"]], ["Encore", ["Johnny B. Goode", "Mississippi Half-Step Uptown Toodeloo", "And We Bid You Good Night"]]] },
  "1987|Giants Stadium (with Dylan)": { d: "Jul 12, 1987 (Dead sets only; Dylan’s set not counted)", s: [["Set 1", ["Hell in a Bucket", "West L.A. Fadeaway", "Greatest Story Ever Told", "Loser", "Tons of Steel", "Ramble On Rose", "When I Paint My Masterpiece", "When Push Comes to Shove", "Promised Land", "Bertha"]], ["Set 2", ["Morning Dew", "Playing in the Band", "Drums", "Space", "The Other One", "Stella Blue", "Throwing Stones", "Not Fade Away"]]] },
  "1991|Giants Stadium": { d: "Jun 17, 1991", s: [["Set 1", ["Eyes of the World", "Walkin' Blues", "Brown-Eyed Women", "Dark Star", "When I Paint My Masterpiece", "Loose Lucy", "Cassidy", "Might as Well"]], ["Set 2", ["Saint of Circumstance", "Ship of Fools", "Dark Star", "Truckin'", "New Speedway Boogie", "Uncle John's Band", "Drums", "Space", "China Doll", "Playing in the Band", "Sugar Magnolia"]], ["Encore", ["The Weight"]]] },
  "1969|Woodstock": { d: "Aug 16, 1969 (Woodstock)", s: [["Set", ["St. Stephen", "Mama Tried", "Dark Star", "High Time", "Turn On Your Lovelight"]]] },
  "1978|Sound and Light Theatre, Pyramids": { d: "Sep 16, 1978 (under a lunar eclipse)", s: [["Set 1", ["Bertha", "Good Lovin'", "Candyman", "Looks Like Rain", "Row Jimmy", "El Paso", "Ramble On Rose", "New Minglewood Blues", "Deal"]], ["Set 2", ["Ollin Arageed", "Fire on the Mountain", "Iko Iko", "I Need a Miracle", "It's All Over Now", "Sunrise", "Shakedown Street", "Drums", "Space", "Truckin'", "Stella Blue", "Around and Around"]], ["Encore", ["One More Saturday Night"]]] },
  "1972|Old Renaissance Faire Grounds": { d: "Aug 27, 1972 (Sunshine Daydream)", s: [["Set 1", ["Promised Land", "Sugaree", "Me and My Uncle", "Deal", "Black-Throated Wind", "China Cat Sunflower", "I Know You Rider", "Mexicali Blues", "Bertha"]], ["Set 2", ["Playing in the Band", "He's Gone", "Jack Straw", "Bird Song", "Greatest Story Ever Told"]], ["Set 3", ["Dark Star", "El Paso", "Sing Me Back Home", "Sugar Magnolia", "Casey Jones", "One More Saturday Night"]]] },
  "1973|Watkins Glen Raceway": { d: "Jul 28, 1973 (Summer Jam)", s: [["Set 1", ["Bertha", "Beat It On Down the Line", "Brown-Eyed Women", "Mexicali Blues", "Box of Rain", "Here Comes Sunshine", "Looks Like Rain", "Row Jimmy", "Jack Straw", "Deal", "Playing in the Band"]], ["Set 2", ["Around and Around", "Loose Lucy", "Big River", "He's Gone", "Truckin'", "Nobody's Fault But Mine", "El Paso", "China Cat Sunflower", "I Know You Rider", "Stella Blue", "Eyes of the World", "Sugar Magnolia"]], ["Finale (with members of the Band and Allman Brothers)", ["Sing Me Back Home", "Not Fade Away", "Mountain Jam", "Johnny B. Goode"]]] },
  "1995|Soldier Field": { d: "Jul 9, 1995 (the final show)", s: [["Set 1", ["Touch of Grey", "Little Red Rooster", "Lazy River Road", "When I Paint My Masterpiece", "Childhood's End", "Cumberland Blues", "Promised Land"]], ["Set 2", ["Shakedown Street", "Samson and Delilah", "So Many Roads", "Samba in the Rain", "Corrina", "Drums", "Space", "Unbroken Chain", "Sugar Magnolia"]], ["Encore", ["Black Muddy River", "Box of Rain"]]] },
  "1977|Barton Hall, Cornell": { d: "May 8, 1977", s: [["Set 1", ["New Minglewood Blues", "Loser", "El Paso", "They Love Each Other", "Jack Straw", "Deal", "Lazy Lightning", "Supplication", "Brown-Eyed Women", "Mama Tried", "Row Jimmy", "Dancing in the Street"]], ["Set 2", ["Scarlet Begonias", "Fire on the Mountain", "Estimated Prophet", "St. Stephen", "Not Fade Away", "Morning Dew"]], ["Encore", ["One More Saturday Night"]]] },
  "1970|Fillmore East": { d: "Feb 13, 1970 (early show)", s: [["Set 1", ["Cold Rain and Snow", "Beat It On Down the Line", "Good Lovin'", "Drums", "Mama Tried", "Black Peter", "Hard to Handle", "St. Stephen", "Not Fade Away"]], ["Encore", ["Casey Jones"]]] },
};

export interface ItemDef {
  n: string;
  e: string;
  c: number;
  p: number;
  d: number;
  step: number;
  nb?: 1;
  note: string;
}

export const ITEMS: Record<ItemKey, ItemDef> = {
  bracelet: { n: 'Hemp bracelets', e: '📿', c: 2, p: 6, d: 30, step: 5, note: 'cheap to make, steady sellers' },
  dye: { n: 'Tie-dyes', e: '🌈', c: 9, p: 22, d: 10, step: 2, note: 'the classic, big margins' },
  food: { n: 'Grilled cheese burritos', e: '🌯', c: 2.5, p: 6, d: 28, step: 5, note: 'spoils after tonight' },
  party: { n: 'Wholesale “party favors”', e: '🍄', c: 12, p: 30, d: 9, step: 2, note: 'big money, and the heat is real' },
  tape: { n: 'Bootleg tapes', e: '📼', c: 1, p: 8, d: 12, step: 5, nb: 1, note: 'from taper tickets' },
};

export const KEYS = Object.keys(ITEMS) as ItemKey[];

export const ST = [
  { l: 'Cheap', m: 0.8, e: 1.5 },
  { l: 'Fair', m: 1, e: 1 },
  { l: 'Gouge', m: 1.35, e: 0.5 },
];

export const UPGRADES: Record<string, [string, number]> = {
  tires: ['Heavy-duty tires', 80],
  engine: ['Rebuilt engine', 150],
  ext: ['Fire extinguisher', 25],
};

export const SCENE_EMOJIS: Record<Phase, string[]> = {
  shop: ['🧵', '🌈', '📿', '🌯'],
  lot: ['🚐', '🌯', '🍄', '🎶'],
  result: ['💰', '📿', '🌈', '💸'],
  show: ['🎸', '🌹', '⚡', '🎶'],
  after: ['🌙', '🌹', '🎟️', '⭐'],
  emerg: ['🚨', '🔧', '🚨', '🔧'],
  end: ['🌹', '💀', '⚡', '🎶'],
};

export const randBetween = (a: number, b: number): number =>
  a + Math.random() * (b - a);

export const fmtMoney = (n: number): string =>
  '$' + (Math.abs(n) < 10 ? n.toFixed(2) : Math.round(n).toLocaleString());

export function createVenue(i: number): VenueState {
  const m = {} as Record<ItemKey, number>;
  KEYS.forEach((k) => {
    m[k] = randBetween(0.6, 1.5);
  });
  return {
    i,
    m,
    crowd: randBetween(0.8, 1.4),
    ticket: Math.round(2 + (V[i][2] - 1965) * 0.9),
  };
}

export function createInitialGameState(): GameState {
  return {
    i: 0,
    cash: 80,
    vibes: 0,
    shows: 0,
    inv: { bracelet: 0, dye: 0, food: 0, party: 0, tape: 0 },
    buy: { bracelet: 0, dye: 0, food: 0, party: 0, tape: 0 },
    st: { bracelet: 1, dye: 1, food: 1, party: 1, tape: 1 },
    ph: 'shop',
    log: [],
    roadLog: [],
    free: false,
    v: createVenue(0),
    why: '',
    heard: {},
    stamps: [],
    last: { all: [], nw: [] },
    skip: 0,
    baby: 0,
    van: 100,
    up: {},
    tix: 0,
    saved: 0,
    score: 0,
    cr: {},
    emIndex: null,
  };
}

export function getShopCost(s: GameState): number {
  return KEYS.reduce((t, k) => t + s.buy[k] * ITEMS[k].c * inf(s.i), 0);
}

export function bustSound(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const A = new AudioCtx();
    const o = A.createOscillator();
    const g = A.createGain();
    o.type = 'sawtooth';
    o.connect(g);
    g.connect(A.destination);
    g.gain.value = 0.08;
    const t = A.currentTime;
    for (let i = 0; i < 6; i++) {
      o.frequency.setValueAtTime(i % 2 ? 700 : 950, t + i * 0.4);
    }
    o.start(t);
    o.stop(t + 2.4);
  } catch {
    // Audio unavailable
  }
}

export interface EmergencyOption {
  label: string;
  baseCost: number;
  resolve: (s: GameState, stopRun: (why: string) => void) => string;
}

export interface EmergencyDef {
  w: number;
  c?: 1;
  b?: 1;
  y?: [number, number];
  ok?: (s: GameState) => boolean;
  e: string;
  t: string;
  x: string;
  options: EmergencyOption[];
}

export const EMERGENCIES: EmergencyDef[] = [
  {
    w: 3, c: 1, e: '🛞', t: 'Flat tire!',
    x: 'Blowout on the highway. You’re stuck on the shoulder.',
    options: [
      {
        label: 'Buy a new tire', baseCost: 45,
        resolve: (s) => {
          const k = c$(45, s.i);
          if (k > s.cash) {
            s.skip = 1;
            return 'You can’t afford a tire, so you wait all night and miss the show.';
          }
          s.cash -= k;
          return 'New tire on, and you roll out.';
        },
      },
      {
        label: 'Patch it and wait it out (miss tonight’s show)', baseCost: 0,
        resolve: (s) => {
          s.skip = 1;
          return 'You patch it up and lose the whole night.';
        },
      },
    ],
  },
  {
    w: 1, c: 1, e: '🔧', t: 'Engine blows up!',
    x: 'Smoke pours from the hood and the van dies.',
    options: [
      {
        label: 'Pay for a rebuild', baseCost: 120,
        resolve: (s, stopRun) => {
          const k = c$(120, s.i);
          if (k > s.cash) {
            stopRun('Your engine died and you couldn’t pay for a rebuild. The tour ends on the side of the road.');
            return '';
          }
          s.cash -= k;
          s.skip = 1;
          return 'Engine rebuilt. Painful, but you’re moving.';
        },
      },
      {
        label: 'Abandon the van and hitchhike home', baseCost: 0,
        resolve: (_s, stopRun) => {
          stopRun('You left the van behind and hitched home. The tour is over.');
          return '';
        },
      },
    ],
  },
  {
    w: 3, e: '🚔', t: 'Busted!',
    x: 'Cops pull you over and search the van.',
    options: [
      {
        label: 'Pay the fine and bail', baseCost: 80,
        resolve: (s, stopRun) => {
          const k = c$(80, s.i);
          if (k > s.cash) {
            if (s.inv.party > 0) {
              stopRun('You were busted with party favors and couldn’t make bail. The tour ends in county jail.');
              return '';
            }
            s.skip = 1;
            return 'You can’t make bail and spend the night in a cell. You miss the show.';
          }
          s.cash -= k;
          s.inv.party = 0;
          s.vibes = Math.max(0, s.vibes - 8);
          return 'You pay up and they let you go.';
        },
      },
      {
        label: 'Sit in jail (miss the show)', baseCost: 0,
        resolve: (s, stopRun) => {
          if (s.inv.party > 0) {
            stopRun('Busted with party favors. The tour ends in county jail.');
            return '';
          }
          s.skip = 1;
          return 'You spend the night in a cell and miss the show.';
        },
      },
    ],
  },
  {
    w: 3, e: '🤒', t: 'You’re sick!',
    x: 'Fever, chills, and a bad stomach. Something in the lot didn’t agree with you.',
    options: [
      {
        label: 'See a doctor', baseCost: 35,
        resolve: (s) => {
          const k = c$(35, s.i);
          if (k > s.cash) {
            s.skip = 1;
            return 'No money for a doctor. You tough it out in the van and miss the show.';
          }
          s.cash -= k;
          s.vibes = Math.max(0, s.vibes - 3);
          return 'The doctor says rest and fluids. You feel better by morning.';
        },
      },
      {
        label: 'Sleep it off in the van (miss the show)', baseCost: 0,
        resolve: (s) => {
          s.skip = 1;
          return 'You sleep it off and miss the show.';
        },
      },
    ],
  },
  {
    w: 2, e: '👛', t: 'Wallet stolen!',
    x: 'Someone lifted your wallet in the crowd.',
    options: [
      {
        label: 'Shake it off and move on', baseCost: 0,
        resolve: (s) => {
          s.cash = Math.floor(s.cash / 2);
          return 'Half your cash is gone.';
        },
      },
    ],
  },
  {
    w: 1, e: '📞', t: 'Family emergency',
    x: 'A call from home: your mom is in the hospital.',
    options: [
      {
        label: 'Go home (ends the tour)', baseCost: 0,
        resolve: (_s, stopRun) => {
          stopRun('A family emergency called you home. The tour is over, but family comes first.');
          return '';
        },
      },
      {
        label: 'Send money and stay on tour', baseCost: 60,
        resolve: (s, stopRun) => {
          const k = c$(60, s.i);
          if (k > s.cash) {
            stopRun('You couldn’t send money and had to go home. The tour is over.');
            return '';
          }
          s.cash -= k;
          s.vibes = Math.max(0, s.vibes - 5);
          return 'You wire money home and keep going, heavy-hearted.';
        },
      },
    ],
  },
  {
    w: 3, c: 1, e: '🔋', t: 'Dead battery',
    x: 'You left the lights on in the lot. The van won’t turn over.',
    options: [
      {
        label: 'Ask a Head for a jump (costs you the night)', baseCost: 0,
        resolve: (s) => {
          s.skip = 1;
          s.vibes += 2;
          return 'A friendly Head jump-starts you and you swap stories until late. You miss the show.';
        },
      },
      {
        label: 'Buy a new battery', baseCost: 40,
        resolve: (s) => {
          const k = c$(40, s.i);
          if (k > s.cash) {
            s.skip = 1;
            return 'No cash for a battery. You wait for a jump and miss the show.';
          }
          s.cash -= k;
          s.van = Math.min(100, s.van + 10);
          return 'New battery in. Fixed.';
        },
      },
    ],
  },
  {
    w: 3, c: 1, e: '🌡️', t: 'Overheating!',
    x: 'Steam pours out from under the hood on a long hill.',
    options: [
      {
        label: 'Wait for it to cool (miss the show)', baseCost: 0,
        resolve: (s) => {
          s.skip = 1;
          return 'You wait for hours and miss the show.';
        },
      },
      {
        label: 'Replace the radiator', baseCost: 70,
        resolve: (s) => {
          const k = c$(70, s.i);
          if (k > s.cash) {
            s.skip = 1;
            return 'No money for a radiator, so you wait it out and miss the show.';
          }
          s.cash -= k;
          s.van = Math.min(100, s.van + 20);
          return 'New radiator in. The van runs cool again.';
        },
      },
    ],
  },
  {
    w: 2, c: 1, e: '⛽', t: 'Out of gas!',
    x: 'The gauge was lying. You run dry on a back road.',
    options: [
      {
        label: 'Hike to a station for a gas can', baseCost: 20,
        resolve: (s) => {
          const k = c$(20, s.i);
          if (k > s.cash) {
            s.skip = 1;
            return 'You’re broke, so you wait for a ride and miss the show.';
          }
          s.cash -= k;
          return 'You buy a can, fill up, and get going.';
        },
      },
      {
        label: 'Wait for a ride (miss the show)', baseCost: 0,
        resolve: (s) => {
          s.skip = 1;
          return 'A trucker gives you a lift to a station. You miss the show.';
        },
      },
    ],
  },
  {
    w: 2, c: 1, e: '🌧️', t: 'Stuck in the mud!',
    x: 'Rain turned the field lot into soup and the van is buried to the axles.',
    options: [
      {
        label: 'Pay for a tow', baseCost: 50,
        resolve: (s) => {
          const k = c$(50, s.i);
          if (k > s.cash) {
            s.skip = 1;
            return 'No cash for a tow. You dig all night and miss the show.';
          }
          s.cash -= k;
          return 'A tow truck pulls you out.';
        },
      },
      {
        label: 'Dig it out with friends (miss the show)', baseCost: 0,
        resolve: (s) => {
          s.skip = 1;
          s.vibes += 2;
          return 'You and some friendly Heads push it out at dawn.';
        },
      },
    ],
  },
  {
    w: 2, c: 1, e: '🛑', t: 'Brakes failing!',
    x: 'The pedal goes soft on a steep grade.',
    options: [
      {
        label: 'Fix the brakes', baseCost: 70,
        resolve: (s, stopRun) => {
          const k = c$(70, s.i);
          if (k > s.cash) {
            if (Math.random() < 0.3) {
              stopRun('Your brakes failed on a mountain road. The tour ends in a ditch.');
              return '';
            }
            return 'You can’t afford repairs, so you limp on and get lucky this time.';
          }
          s.cash -= k;
          s.van = Math.min(100, s.van + 15);
          return 'New brake pads in. Safe again.';
        },
      },
      {
        label: 'Limp on and hope', baseCost: 0,
        resolve: (_s, stopRun) => {
          if (Math.random() < 0.3) {
            stopRun('Your brakes failed on a mountain road. The tour ends in a ditch.');
            return '';
          }
          return 'You limp on, white-knuckled, and make it.';
        },
      },
    ],
  },
  {
    w: 2, e: '🎫', t: 'Lost ticket!',
    x: 'Your ticket fell out of your pocket somewhere in the lot.',
    options: [
      {
        label: 'Plead your case at the gate', baseCost: 0,
        resolve: (s) => {
          if (Math.random() < 0.3 + s.vibes / 150) {
            s.free = true;
            return 'You plead your case at the gate. The guard takes pity and waves you in. Tonight is free.';
          }
          s.skip = 1;
          return 'You plead your case at the gate. No luck. You miss the show.';
        },
      },
      {
        label: 'Buy one from a scalper', baseCost: 30,
        resolve: (s) => {
          const k = c$(30, s.i);
          if (k > s.cash) {
            s.skip = 1;
            return 'No cash for a scalper, so you miss the show.';
          }
          s.cash -= k;
          s.free = true;
          return 'You overpay, but you have a ticket.';
        },
      },
    ],
  },
  {
    w: 1, c: 1, e: '🔥', t: 'Van fire!',
    x: 'Flames lick out from under the hood.',
    options: [
      {
        label: 'Fight it with a borrowed extinguisher', baseCost: 0,
        resolve: (s, stopRun) => {
          if (Math.random() < (s.up.ext ? 0 : 0.35)) {
            stopRun('Your van burned to the ground. The tour ends in the ashes.');
            return '';
          }
          s.van = Math.max(5, s.van - 35);
          KEYS.forEach((k) => {
            s.inv[k] = Math.floor(s.inv[k] / 2);
          });
          return 'You put it out, but the van is scorched and half your stock is ruined.';
        },
      },
      {
        label: 'Pay for emergency repairs and a tow', baseCost: 150,
        resolve: (s, stopRun) => {
          const k = c$(150, s.i);
          if (k > s.cash) {
            stopRun('Your van burned and you couldn’t afford repairs. The tour ends in the ashes.');
            return '';
          }
          s.cash -= k;
          s.van = Math.max(30, s.van - 20);
          s.skip = 1;
          return 'A tow and a rush repair get you rolling, but you lose the night.';
        },
      },
    ],
  },
  {
    w: 2, e: '🌀', t: 'Bad trip!',
    x: 'Something from the lot hit way too hard and the whole world is spinning.',
    options: [
      {
        label: 'Ride it out with a friendly Head (miss the show)', baseCost: 0,
        resolve: (s) => {
          s.skip = 1;
          s.vibes += 3;
          return 'You ride it out wide-eyed with a stranger who turns out to be great company.';
        },
      },
      {
        label: 'Go to the medical tent', baseCost: 25,
        resolve: (s) => {
          const k = c$(25, s.i);
          if (k > s.cash) {
            s.skip = 1;
            return 'No cash for the tent, so you ride it out alone and miss the show.';
          }
          s.cash -= k;
          s.vibes = Math.max(0, s.vibes - 2);
          s.skip = 1;
          return 'The volunteers talk you down. You’re okay, but wiped out.';
        },
      },
    ],
  },
  {
    w: 2, c: 1, e: '🔑', t: 'Locked out!',
    x: 'You’ve locked the keys inside the van.',
    options: [
      {
        label: 'Call a locksmith', baseCost: 30,
        resolve: (s) => {
          const k = c$(30, s.i);
          if (k > s.cash) {
            s.skip = 1;
            return 'No money for a locksmith, so you wait hours for a friend with a coat hanger. You miss the show.';
          }
          s.cash -= k;
          return 'The locksmith has you in minutes.';
        },
      },
      {
        label: 'Smash a window and drive on', baseCost: 0,
        resolve: (s) => {
          s.van = Math.max(5, s.van - 10);
          return 'Crunch. You’re in, but the van is battered.';
        },
      },
    ],
  },
  {
    w: 2, e: '🌧️', t: 'Soaked stock!',
    x: 'A leaky roof turns the back of the van into a swamp.',
    options: [
      {
        label: 'Buy tarps and dry it out', baseCost: 25,
        resolve: (s) => {
          const k = c$(25, s.i);
          if (k > s.cash) {
            KEYS.forEach((key) => {
              s.inv[key] = Math.floor(s.inv[key] / 2);
            });
            return 'No money for tarps, so half your stock is ruined.';
          }
          s.cash -= k;
          return 'You save nearly everything.';
        },
      },
      {
        label: 'Lay it out and hope', baseCost: 0,
        resolve: (s) => {
          KEYS.forEach((key) => {
            s.inv[key] = Math.floor(s.inv[key] * 0.6);
          });
          return 'You lay it all out in the sun. About 40% of your stock is ruined.';
        },
      },
    ],
  },
  {
    w: 2, e: '🐕', t: 'Dog raid!',
    x: 'A hungry dog tears into your food and tape boxes.',
    options: [
      {
        label: 'Chase it down', baseCost: 0,
        resolve: (s) => {
          if (Math.random() < 0.5) {
            return 'You sprint after the dog. You recover everything, covered in slobber.';
          }
          s.inv.food = 0;
          s.inv.tape = Math.floor((s.inv.tape || 0) / 2);
          return 'You sprint after the dog. The dog gets away with your burritos and half your tapes.';
        },
      },
      {
        label: 'Let it eat', baseCost: 0,
        resolve: (s) => {
          s.inv.food = 0;
          s.vibes += 2;
          s.inv.tape = Math.floor((s.inv.tape || 0) / 2);
          return 'You let the dog have its feast, and the crowd loves it.';
        },
      },
    ],
  },
  {
    w: 3, c: 1, e: '🚨', t: 'Speeding ticket!',
    x: 'A state trooper lights you up for doing 80 in a 55.',
    options: [
      {
        label: 'Pay the ticket', baseCost: 50,
        resolve: (s) => {
          const k = c$(50, s.i);
          if (k > s.cash) {
            s.skip = 1;
            return 'You can’t cover the fine and spend the night sorting it out. You miss the show.';
          }
          s.cash -= k;
          return 'You pay up and get a warning.';
        },
      },
      {
        label: 'Fight it in court', baseCost: 0,
        resolve: (s) => {
          if (Math.random() < 0.4) {
            return 'You fight the ticket. The judge dismisses it!';
          }
          s.cash = Math.max(0, s.cash - c$(90, s.i));
          s.skip = 1;
          return 'You fight the ticket. You lose, pay a bigger fine, and miss the show.';
        },
      },
    ],
  },
  {
    w: 2, e: '🥵', t: 'Heat wave!',
    x: 'The lot is a frying pan and people are dropping.',
    options: [
      {
        label: 'Buy water and shade', baseCost: 10,
        resolve: (s) => {
          const k = c$(10, s.i);
          if (k > s.cash) {
            s.skip = 1;
            return 'No money for supplies, so you wilt in the heat and miss the show.';
          }
          s.cash -= k;
          s.vibes += 2;
          return 'You stay cool and keep others hydrated.';
        },
      },
      {
        label: 'Tough it out', baseCost: 0,
        resolve: (s) => {
          if (Math.random() < 0.5) {
            s.skip = 1;
            s.vibes = Math.max(0, s.vibes - 2);
            return 'You tough it out. Heatstroke hits and you miss the show.';
          }
          return 'You tough it out. You survive, a little cooked.';
        },
      },
    ],
  },
  {
    w: 2, e: '🎭', t: 'Sketchy ticket offer',
    x: 'A smooth talker whispers that he has a “miracle” ticket for you.',
    options: [
      {
        label: 'Buy it', baseCost: 25,
        resolve: (s) => {
          const k = c$(25, s.i);
          if (k > s.cash) {
            s.skip = 1;
            return 'You can’t afford it and miss out.';
          }
          s.cash -= k;
          if (Math.random() < 0.55) {
            s.free = true;
            return 'You hand over the cash. It’s real! You’re in tonight.';
          }
          s.skip = 1;
          return 'You hand over the cash. It’s a fake, and the gate turns you away.';
        },
      },
      {
        label: 'Walk away', baseCost: 0,
        resolve: () => 'You walk away and keep your cash.',
      },
    ],
  },
  {
    w: 1, y: [1965, 1972], e: '📬', t: 'Draft notice!',
    x: 'Your draft notice arrives, and the Vietnam War is on.',
    options: [
      {
        label: 'Report for your physical (ends the tour)', baseCost: 0,
        resolve: (_s, stopRun) => {
          stopRun('You received a draft notice and had to report. The tour is over.');
          return '';
        },
      },
      {
        label: 'Hire a draft counselor', baseCost: 60,
        resolve: (s, stopRun) => {
          const k = c$(60, s.i);
          if (k > s.cash) {
            stopRun('You couldn’t afford help and were drafted. The tour ends.');
            return '';
          }
          s.cash -= k;
          s.vibes = Math.max(0, s.vibes - 5);
          return 'A counselor finds you a deferral. You keep touring, but you’re shaken.';
        },
      },
    ],
  },
  {
    w: 2, ok: (s) => (s.inv.tape || 0) > 0, e: '📻', t: 'Tape deck breaks!',
    x: 'Your dubbing deck chews up the tapes.',
    options: [
      {
        label: 'Fix the deck', baseCost: 20,
        resolve: (s) => {
          const k = c$(20, s.i);
          if (k > s.cash) {
            s.inv.tape = 0;
            return 'No money to fix it, and your tapes are lost.';
          }
          s.cash -= k;
          return 'Fixed, and your tapes are saved.';
        },
      },
      {
        label: 'Write them off', baseCost: 0,
        resolve: (s) => {
          s.inv.tape = 0;
          return 'You toss the ruined tapes.';
        },
      },
    ],
  },
  {
    w: 2, e: '🧦', t: 'Camp thief!',
    x: 'You spot someone rummaging through your stock.',
    options: [
      {
        label: 'Chase the thief', baseCost: 0,
        resolve: (s) => {
          if (Math.random() < 0.4) {
            return 'You chase the thief across the lot. You catch them and get everything back!';
          }
          KEYS.forEach((key) => {
            s.inv[key] = Math.floor(s.inv[key] / 2);
          });
          s.vibes = Math.max(0, s.vibes - 1);
          return 'You chase the thief across the lot. They get away with half your stock.';
        },
      },
      {
        label: 'Let it go', baseCost: 0,
        resolve: (s) => {
          KEYS.forEach((key) => {
            s.inv[key] = Math.floor(s.inv[key] * 0.7);
          });
          return 'You let them go.';
        },
      },
    ],
  },
  {
    w: 1, b: 1, e: '👶', t: 'Baby on the way!',
    x: 'You’re going to be a parent. Congratulations!',
    options: [
      {
        label: 'Go home and raise your kid (ends the tour)', baseCost: 0,
        resolve: (_s, stopRun) => {
          stopRun('You went home to raise a baby. The best stop of all.');
          return '';
        },
      },
      {
        label: 'Bring the baby on tour', baseCost: 0,
        resolve: (s) => {
          s.baby = 1;
          s.vibes += 5;
          return 'Baby on board! Expenses are higher from now on, but you’ve got a tiny Deadhead.';
        },
      },
    ],
  },
];

export function pickEmergencyIndex(s: GameState): number {
  const yr = V[s.i][2];
  const eligible: Array<{ idx: number; weight: number }> = [];
  EMERGENCIES.forEach((e, idx) => {
    if (e.b && s.baby) return;
    if (e.y && (yr < e.y[0] || yr > e.y[1])) return;
    if (e.ok && !e.ok(s)) return;
    const w =
      e.w *
      (e.c ? 1 + (100 - s.van) / 40 : 1) *
      (s.up.tires && e.t === 'Flat tire!' ? 0.4 : 1);
    eligible.push({ idx, weight: w });
  });
  const total = eligible.reduce((a, b) => a + b.weight, 0);
  let r = Math.random() * total;
  for (const item of eligible) {
    if ((r -= item.weight) < 0) return item.idx;
  }
  return eligible[0]?.idx ?? 0;
}

export function playSetForStop(s: GameState): {
  logs: LogEntry[];
  all: string[];
  nw: string[];
  heard: Record<string, 1>;
} {
  const key = `${V[s.i][2]}|${V[s.i][0]}`;
  const real = REAL[key];
  const heard = { ...s.heard };

  if (real) {
    const nw: string[] = [];
    const flat = real.s.flatMap((x) => x[1]);
    flat.forEach((name) => {
      if (!heard[name]) {
        heard[name] = 1;
        nw.push(name);
      }
    });
    const logs: LogEntry[] = [
      [{ text: '🎶 You’re inside for the whole night. ' }, { text: '+10 vibes', tone: 'good' }],
      [{ text: '✅ ' }, { text: `Real show: ${real.d}`, tone: 'bold' }, { text: ' (this is the actual setlist)' }],
      ...real.s.map((x) => [{ text: `${x[0]}: ${x[1].join(', ')}` }]),
      nw.length
        ? [{ text: `🆕 New in your songbook (${nw.length}): ${nw.join(', ')}`, tone: 'good' }]
        : [{ text: 'Nothing new tonight, but great versions.' }],
    ];
    return { logs, all: flat, nw, heard };
  }

  const yr = V[s.i][2];
  const n = yr < 1968 ? 10 : yr < 1973 ? 16 : 20;
  const pool = SONGS.filter((song) => song.y <= yr);
  const pick: Song[] = [];

  for (let k = 0; k < n && pool.length; k++) {
    const w = pool.map(
      (song) =>
        [0, 6, 3, 1.2, 2.5][song.t] *
        (song.t > 1 ? 1 + s.vibes / 60 : 1) *
        (heard[song.n] ? 1 : 3)
    );
    let r = Math.random() * w.reduce((a, b) => a + b, 0);
    let j = 0;
    while ((r -= w[j]) > 0 && j < w.length - 1) j++;
    pick.push(pool.splice(j, 1)[0]);
  }

  const nwSongs: Song[] = [];
  pick.forEach((song) => {
    if (!heard[song.n]) {
      heard[song.n] = 1;
      nwSongs.push(song);
    }
  });

  const logs: LogEntry[] = [
    [{ text: '🎶 You’re inside for the whole night. ' }, { text: '+10 vibes', tone: 'good' }],
    [{ text: `🎲 No setlist survives from this night (the Acid Tests and Trips Festival were never documented), so these songs are an era-based guess: ${pick.map((x) => x.n).join(', ')}` }],
    nwSongs.length
      ? [{
          text: `🆕 New in your songbook (${nwSongs.length}): ${nwSongs
            .map((x) => (x.t === 3 ? '⭐ ' : '') + x.n)
            .join(', ')}`,
          tone: 'good',
        }]
      : [{ text: 'Nothing new tonight, but some great versions.' }],
  ];

  return {
    logs,
    all: pick.map((x) => x.n),
    nw: nwSongs.map((x) => x.n),
    heard,
  };
}
