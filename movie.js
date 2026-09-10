/* =====================================
   TMDB SETTINGS
===================================== */

const TMDB_API_KEY =
  "251df1615bce950080afdcb1b8674562";

const TMDB_BASE_URL =
  "https://api.themoviedb.org/3";

const TMDB_IMAGE_BASE =
  "https://image.tmdb.org/t/p/w185";


/* =====================================
   ELEMENTS
===================================== */

const viewport =
  document.getElementById("viewport");

const world =
  document.getElementById("world");

const backButton =
  document.getElementById("backButton");

const searchButton =
  document.getElementById("searchButton");

const searchBox =
  document.getElementById("searchBox");

const searchInput =
  document.getElementById("searchInput");

const closeSearchButton =
  document.getElementById("closeSearchButton");

const personHeader =
  document.getElementById("personHeader");

const personName =
  document.getElementById("personName");

const personTabs =
  document.getElementById("personTabs");

const moviePanel =
  document.getElementById("moviePanel");

const closePanelButton =
  document.getElementById("closePanelButton");

const panelPoster =
  document.getElementById("panelPoster");

const panelTitle =
  document.getElementById("panelTitle");

const panelMeta =
  document.getElementById("panelMeta");

const panelDirector =
  document.getElementById("panelDirector");

const panelCast =
  document.getElementById("panelCast");

const panelMusic =
  document.getElementById("panelMusic");

const panelGenres =
  document.getElementById("panelGenres");

const panelWriting = document.getElementById("panelWriting");
const panelProduction = document.getElementById("panelProduction");
const panelActing = document.getElementById("panelActing");

const panelOverview =
  document.getElementById("panelOverview");

const spotifyButton =
  document.getElementById("spotifyButton");

const youtubeButton =
  document.getElementById("youtubeButton");


/* =====================================
   POSTER SETTINGS
===================================== */

const POSTER_WIDTH = 170;
const POSTER_HEIGHT = 255;

const GAP_X = 24;
const GAP_Y = 24;

const COLUMN_COUNT = 12;

const START_X = 250;
const START_Y = 170;

const COLUMN_OFFSETS = [
  60,
  0,
  35,
  80,
  20,
  65,
  10,
  50,
  90,
  30,
  70,
  15
];


/* =====================================
   STATE
===================================== */

let currentMovies = [];

let currentPageInfo = {
  type: "home",
  data: null
};

const historyStack = [];

let activePanelMovieId =
  null;


/* =====================================
   CACHE
===================================== */

const movieDetailsCache =
  new Map();

const personCreditsCache =
  new Map();


/* =====================================
   CLICK
===================================== */

let singleClickTimer =
  null;

const SINGLE_CLICK_DELAY =
  300;


/* =====================================
   API
===================================== */

async function fetchJson(url) {

  const response =
    await fetch(url);

  if (!response.ok) {

    throw new Error(
      `TMDB API ERROR: ${response.status}`
    );

  }

  return await response.json();

}


/* =====================================
   POSTER FILTER
===================================== */

async function filterDisplayableMovies(movies) {

  return removeDuplicateMovies(
    (movies || []).filter(function (movie) {
      return Boolean(movie && movie.poster_path);
    })
  );
}


/* =====================================
   HOME MOVIES
===================================== */

async function getHomeMovies() {

  const requests = [];


  /* popular 2 pages */

  for (
    let page = 1;
    page <= 2;
    page++
  ) {

    requests.push(

      fetchJson(
        `${TMDB_BASE_URL}/movie/popular` +
        `?api_key=${TMDB_API_KEY}` +
        `&page=${page}`
      )

    );

  }


  /* top rated 2 pages */

  for (
    let page = 1;
    page <= 2;
    page++
  ) {

    requests.push(

      fetchJson(
        `${TMDB_BASE_URL}/movie/top_rated` +
        `?api_key=${TMDB_API_KEY}` +
        `&page=${page}`
      )

    );

  }


  /* discover 2 pages */

  for (
    let page = 1;
    page <= 2;
    page++
  ) {

    requests.push(

      fetchJson(
        `${TMDB_BASE_URL}/discover/movie` +
        `?api_key=${TMDB_API_KEY}` +
        `&sort_by=popularity.desc` +
        `&vote_count.gte=300` +
        `&page=${page}`
      )

    );

  }


  const responses =
    await Promise.all(
      requests
    );


  const movies = [];

  const ids =
    new Set();


  responses.forEach(
    function (data) {

      data.results?.forEach(
        function (movie) {

          if (
            !movie.poster_path ||
            ids.has(movie.id)
          ) {

            return;

          }

          ids.add(
            movie.id
          );

          movies.push(
            movie
          );

        }
      );

    }
  );


  const filteredMovies =
    await filterDisplayableMovies(movies);

  return filteredMovies.slice(
    0,
    100
  );

}


/* =====================================
   SEARCH
===================================== */

async function searchMovies(
  query
) {

  const requests = [];


  for (
    let page = 1;
    page <= 2;
    page++
  ) {

    requests.push(

      fetchJson(

        `${TMDB_BASE_URL}/search/movie` +
        `?api_key=${TMDB_API_KEY}` +
        `&query=${encodeURIComponent(query)}` +
        `&include_adult=false` +
        `&page=${page}`

      )

    );

  }


  const responses =
    await Promise.all(
      requests
    );


  const movies = [];

  const ids =
    new Set();


  responses.forEach(
    function (data) {

      data.results?.forEach(
        function (movie) {

          if (
            !movie.poster_path ||
            ids.has(movie.id)
          ) {

            return;

          }

          ids.add(
            movie.id
          );

          movies.push(
            movie
          );

        }
      );

    }
  );


  return await filterDisplayableMovies(movies);

}




/* =====================================
   PERSON SEARCH
===================================== */

async function searchPeople(
  query
) {

  // 한국어/영문 검색을 함께 시도합니다.
  // TMDB는 인물의 한국어 별칭이 등록되어 있으면 한글 검색어도 찾을 수 있습니다.
  const requests = [
    fetchJson(
      `${TMDB_BASE_URL}/search/person` +
      `?api_key=${TMDB_API_KEY}` +
      `&query=${encodeURIComponent(query)}` +
      `&include_adult=false` +
      `&language=ko-KR` +
      `&page=1`
    ),
    fetchJson(
      `${TMDB_BASE_URL}/search/person` +
      `?api_key=${TMDB_API_KEY}` +
      `&query=${encodeURIComponent(query)}` +
      `&include_adult=false` +
      `&language=en-US` +
      `&page=1`
    )
  ];

  const responses = await Promise.all(requests);
  const merged = [];
  const seen = new Set();

  responses.forEach(function (data) {
    (data.results || []).forEach(function (person) {
      if (!person.id || !person.name || seen.has(person.id)) return;
      seen.add(person.id);
      merged.push(person);
    });
  });

  // 상위 후보들의 TMDB 별칭까지 가져와서 한글 이름 일치 여부를 판별합니다.
  const candidates = merged.slice(0, 12);

  await Promise.all(
    candidates.map(async function (person) {
      try {
        const alt = await fetchJson(
          `${TMDB_BASE_URL}/person/${person.id}/alternative_names` +
          `?api_key=${TMDB_API_KEY}`
        );

        person._searchNames = [
          person.name,
          ...((alt.results || []).map(function (item) {
            return item.name;
          }))
        ].filter(Boolean);
      } catch (error) {
        person._searchNames = [person.name];
      }
    })
  );

  merged.slice(12).forEach(function (person) {
    person._searchNames = [person.name];
  });

  return merged;
}


function normalizeSearchText(
  value
) {

  return String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9가-힣]+/g, "");

}


function findBestPersonMatch(
  people,
  query,
  movies
) {

  if (!people.length) {
    return null;
  }


  const normalizedQuery =
    normalizeSearchText(query);


  const exactPerson =
    people.find(
      function (person) {

        const names = person._searchNames || [person.name];

        return names.some(function (name) {
          return normalizeSearchText(name) === normalizedQuery;
        });

      }
    );


  if (exactPerson) {
    return exactPerson;
  }


  const exactMovie =
    (movies || []).some(
      function (movie) {

        return (
          normalizeSearchText(movie.title) === normalizedQuery ||
          normalizeSearchText(movie.original_title) === normalizedQuery
        );

      }
    );


  if (exactMovie) {
    return null;
  }


  if (normalizedQuery.length < 4) {
    return null;
  }


  const topPerson = people[0];
  const topNames = topPerson._searchNames || [topPerson.name];

  const partialMatch = topNames.some(function (name) {
    const normalizedName = normalizeSearchText(name);
    return (
      normalizedName.includes(normalizedQuery) ||
      normalizedName.endsWith(normalizedQuery)
    );
  });

  if (partialMatch) {
    return topPerson;
  }


  return null;

}


function getPreferredPersonTab(
  person
) {

  const department =
    person?.known_for_department;


  if (department === "Directing") {
    return "directing";
  }

  if (department === "Production") {
    return "production";
  }

  if (department === "Writing") {
    return "writing";
  }

  if (department === "Acting") {
    return "acting";
  }


  return null;

}


/* =====================================
   RELATED MOVIES
===================================== */

async function getRelatedMovies(
  movieId
) {

  const requests = [];


  for (
    let page = 1;
    page <= 2;
    page++
  ) {

    requests.push(

      fetchJson(

        `${TMDB_BASE_URL}/movie/${movieId}/recommendations` +
        `?api_key=${TMDB_API_KEY}` +
        `&page=${page}`

      )

    );

  }


  requests.push(

    fetchJson(

      `${TMDB_BASE_URL}/movie/${movieId}/similar` +
      `?api_key=${TMDB_API_KEY}` +
      `&page=1`

    )

  );


  const responses =
    await Promise.all(
      requests
    );


  const movies = [];

  const ids =
    new Set();


  responses.forEach(
    function (data) {

      data.results?.forEach(
        function (movie) {

          if (
            !movie.poster_path ||
            movie.id === movieId ||
            ids.has(movie.id)
          ) {

            return;

          }

          ids.add(
            movie.id
          );

          movies.push(
            movie
          );

        }
      );

    }
  );


  const filteredMovies =
    await filterDisplayableMovies(movies);

  return filteredMovies.slice(
    0,
    60
  );

}


/* =====================================
   MOVIE DETAILS
===================================== */

async function getMovieDetails(
  movieId
) {

  if (
    movieDetailsCache.has(
      movieId
    )
  ) {

    return movieDetailsCache.get(
      movieId
    );

  }


  const data =
    await fetchJson(

      `${TMDB_BASE_URL}/movie/${movieId}` +
      `?api_key=${TMDB_API_KEY}` +
      `&append_to_response=credits`

    );


  movieDetailsCache.set(
    movieId,
    data
  );


  return data;

}


/* =====================================
   PERSON CREDITS
===================================== */

async function getPersonCredits(
  personId
) {

  if (
    personCreditsCache.has(
      personId
    )
  ) {

    return personCreditsCache.get(
      personId
    );

  }


  const data =
    await fetchJson(

      `${TMDB_BASE_URL}/person/${personId}/combined_credits` +
      `?api_key=${TMDB_API_KEY}`

    );


  personCreditsCache.set(
    personId,
    data
  );


  return data;

}


/* =====================================
   REMOVE DUPLICATES
===================================== */

function removeDuplicateMovies(
  movies
) {

  const ids =
    new Set();


  return movies.filter(
    function (movie) {

      if (
        !movie.id ||
        ids.has(movie.id)
      ) {

        return false;

      }


      ids.add(
        movie.id
      );


      return true;

    }
  );

}


/* =====================================
   SORT
===================================== */

function sortMoviesByDate(
  movies
) {

  return movies.sort(
    function (a, b) {

      const dateA =
        a.release_date || "";

      const dateB =
        b.release_date || "";


      return dateB.localeCompare(
        dateA
      );

    }
  );

}


/* =====================================
   PERSON FILMOGRAPHY
===================================== */

async function buildPersonFilmography(
  personId
) {

  const data =
    await getPersonCredits(
      personId
    );


  const movieCrew =
    (data.crew || []).filter(
      function (credit) {

        return (
          credit.media_type ===
          "movie"
        );

      }
    );


  const movieCast =
    (data.cast || []).filter(
      function (credit) {

        return (
          credit.media_type ===
          "movie"
        );

      }
    );


  let directing =
    movieCrew.filter(
      function (credit) {

        return (
          credit.department ===
          "Directing"
        );

      }
    );


  let production =
    movieCrew.filter(
      function (credit) {

        return (
          credit.department ===
          "Production"
        );

      }
    );


  let writing =
    movieCrew.filter(
      function (credit) {

        return (
          credit.department ===
          "Writing"
        );

      }
    );


  let acting =
    movieCast;


  directing =
    sortMoviesByDate(
      removeDuplicateMovies(
        directing
      )
    );


  production =
    sortMoviesByDate(
      removeDuplicateMovies(
        production
      )
    );


  writing =
    sortMoviesByDate(
      removeDuplicateMovies(
        writing
      )
    );


  acting =
    sortMoviesByDate(
      removeDuplicateMovies(
        acting
      )
    );


  [directing, production, writing, acting] =
    await Promise.all([
      filterDisplayableMovies(directing),
      filterDisplayableMovies(production),
      filterDisplayableMovies(writing),
      filterDisplayableMovies(acting)
    ]);


  return {

    directing,

    production,

    writing,

    acting

  };

}


/* =====================================
   MUSIC FILMOGRAPHY
===================================== */

async function getMusicFilmography(
  personId
) {

  const data =
    await getPersonCredits(
      personId
    );


  let movies =
    (data.crew || []).filter(
      function (credit) {

        if (
          credit.media_type !==
          "movie"
        ) {

          return false;

        }


        return (

          credit.job ===
          "Original Music Composer"

          ||

          credit.job ===
          "Composer"

          ||

          credit.job ===
          "Music Composer"

        );

      }
    );


  movies =
    removeDuplicateMovies(
      movies
    );


  movies =
    sortMoviesByDate(
      movies
    );


  return await filterDisplayableMovies(movies);

}


/* =====================================
   POSITION
===================================== */

function calculatePosition(
  index
) {

  const column =
    index %
    COLUMN_COUNT;


  const row =
    Math.floor(
      index /
      COLUMN_COUNT
    );


  const x =
    START_X +
    column *
    (
      POSTER_WIDTH +
      GAP_X
    );


  const y =
    START_Y +

    COLUMN_OFFSETS[
      column %
      COLUMN_OFFSETS.length
    ] +

    row *
    (
      POSTER_HEIGHT +
      GAP_Y
    );


  return {
    x,
    y
  };

}


/* =====================================
   CREATE POSTER
===================================== */

function createPoster(
  movie,
  index
) {

  if (!movie || !movie.poster_path) {
    return null;
  }

  const position =
    calculatePosition(
      index
    );


  const element =
    document.createElement(
      "div"
    );


  element.className =
    "movie";


  element.dataset.movieId =
    movie.id;


  element.style.left =
    `${position.x}px`;


  element.style.top =
    `${position.y}px`;


  if (
    movie.poster_path
  ) {

    const image =
      document.createElement(
        "img"
      );


    /*
      렉 감소
    */

    image.loading =
      "lazy";


    image.decoding =
      "async";


    image.src =
      TMDB_IMAGE_BASE +
      movie.poster_path;


    image.alt =
      movie.original_title ||
      movie.title ||
      "";


    image.draggable =
      false;


    element.appendChild(
      image
    );

  }

  else {

    const placeholder =
      document.createElement(
        "div"
      );


    placeholder.className =
      "poster-placeholder";


    const title =
      movie.original_title ||
      movie.title ||
      "UNTITLED";


    const year =
      movie.release_date
        ? movie.release_date.slice(
            0,
            4
          )
        : "";


    const titleElement =
      document.createElement(
        "span"
      );


    titleElement.className =
      "placeholder-title";


    titleElement.textContent =
      title;


    const yearElement =
      document.createElement(
        "span"
      );


    yearElement.className =
      "placeholder-year";


    yearElement.textContent =
      year;


    placeholder.appendChild(
      titleElement
    );


    placeholder.appendChild(
      yearElement
    );


    element.appendChild(
      placeholder
    );

  }


  world.appendChild(
    element
  );

}


/* =====================================
   RENDER
===================================== */

function renderMovies(
  movies
) {

  world.innerHTML =
    "";


  const fragment =
    document.createDocumentFragment();


  movies
    .filter(function (movie) {
      return Boolean(movie && movie.poster_path);
    })
    .forEach(
    function (
      movie,
      index
    ) {

      const position =
        calculatePosition(
          index
        );


      const element =
        document.createElement(
          "div"
        );


      element.className =
        "movie";


      element.dataset.movieId =
        movie.id;


      element.style.left =
        `${position.x}px`;


      element.style.top =
        `${position.y}px`;


      if (
        movie.poster_path
      ) {

        const image =
          document.createElement(
            "img"
          );


        image.loading =
          "lazy";


        image.decoding =
          "async";


        image.src =
          TMDB_IMAGE_BASE +
          movie.poster_path;


        image.alt =
          movie.original_title ||
          movie.title ||
          "";


        image.draggable =
          false;


        element.appendChild(
          image
        );

      }

      else {

        const placeholder =
          document.createElement(
            "div"
          );


        placeholder.className =
          "poster-placeholder";


        const title =
          document.createElement(
            "span"
          );


        title.className =
          "placeholder-title";


        title.textContent =
          movie.original_title ||
          movie.title ||
          "UNTITLED";


        const year =
          document.createElement(
            "span"
          );


        year.className =
          "placeholder-year";


        year.textContent =
          movie.release_date
            ? movie.release_date.slice(
                0,
                4
              )
            : "";


        placeholder.appendChild(
          title
        );


        placeholder.appendChild(
          year
        );


        element.appendChild(
          placeholder
        );

      }


      fragment.appendChild(
        element
      );

    }
  );


  world.appendChild(
    fragment
  );

}


/* =====================================
   FIND MOVIE
===================================== */

function findMovieById(
  movieId
) {

  return currentMovies.find(
    function (movie) {

      return (
        movie.id ===
        movieId
      );

    }
  );

}


/* =====================================
   LOADING
===================================== */

function showLoading(
  text = "LOADING..."
) {

  let loading =
    document.querySelector(
      ".loading"
    );


  if (!loading) {

    loading =
      document.createElement(
        "div"
      );


    loading.className =
      "loading";


    document.body.appendChild(
      loading
    );

  }


  loading.textContent =
    text;

}


function hideLoading() {

  document
    .querySelector(
      ".loading"
    )
    ?.remove();

}


/* =====================================
   CAMERA
===================================== */

let scale =
  0.9;

let positionX =
  -100;

let positionY =
  -70;

let isDragging =
  false;

let startMouseX =
  0;

let startMouseY =
  0;

let startPositionX =
  0;

let startPositionY =
  0;

let didDrag =
  false;

const DRAG_THRESHOLD =
  6;


/* =====================================
   TRANSFORM
===================================== */

let transformFrame = null;

function applyTransform() {
  transformFrame = null;
  world.style.transform =
    `translate3d(${positionX}px, ${positionY}px, 0) scale(${scale})`;
}

function updateTransform() {
  if (transformFrame !== null) return;
  transformFrame = requestAnimationFrame(applyTransform);
}


function resetCamera() {

  scale =
    0.9;


  positionX =
    -100;


  positionY =
    -70;


  updateTransform();

}


updateTransform();


/* =====================================
   SAVE PAGE
===================================== */

function saveCurrentPage() {

  historyStack.push({

    movies:
      currentMovies,

    pageInfo:
      currentPageInfo,

    scale,

    positionX,

    positionY

  });

}


/* =====================================
   FADE
===================================== */

function fadeOut() {

  return new Promise(
    function (resolve) {

      world.classList.add(
        "page-leave"
      );


      setTimeout(
        resolve,
        230
      );

    }
  );

}


function fadeIn() {

  world.classList.remove(
    "page-leave"
  );

}


/* =====================================
   PERSON HEADER
===================================== */

function updatePersonHeader() {

  if (
    currentPageInfo.type !==
      "person" &&

    currentPageInfo.type !==
      "music-person"
  ) {

    personHeader.classList.remove(
      "visible"
    );


    document.body.classList.remove(
      "person-view"
    );


    personTabs.innerHTML =
      "";


    return;

  }


  const data =
    currentPageInfo.data;


  personHeader.classList.add(
    "visible"
  );


  document.body.classList.add(
    "person-view"
  );


  personName.textContent =
    data.person.name;


  if (
    currentPageInfo.type ===
    "person"
  ) {

    renderPersonTabs();

  }

  else {

    personTabs.innerHTML =
      "";


    const button =
      document.createElement(
        "button"
      );


    button.className =
      "person-tab active";


    button.textContent =
      `MUSIC (${currentMovies.length})`;


    personTabs.appendChild(
      button
    );

  }

}


/* =====================================
   PERSON TABS
===================================== */

function renderPersonTabs() {

  personTabs.innerHTML =
    "";


  if (
    currentPageInfo.type !==
    "person"
  ) {

    return;

  }


  const pageData =
    currentPageInfo.data;


  const filmography =
    pageData.filmography;


  const tabs = [

    {
      key: "directing",
      label: "DIRECTING"
    },

    {
      key: "production",
      label: "PRODUCTION"
    },

    {
      key: "writing",
      label: "WRITING"
    },

    {
      key: "acting",
      label: "ACTING"
    }

  ];


  tabs.forEach(
    function (tab) {

      const movies =
        filmography[
          tab.key
        ];


      if (
        !movies ||
        movies.length === 0
      ) {

        return;

      }


      const button =
        document.createElement(
          "button"
        );


      button.className =
        "person-tab";


      button.textContent =
        `${tab.label} (${movies.length})`;


      if (
        pageData.activeTab ===
        tab.key
      ) {

        button.classList.add(
          "active"
        );

      }


      button.addEventListener(
        "click",
        function () {

          switchPersonTab(
            tab.key
          );

        }
      );


      personTabs.appendChild(
        button
      );

    }
  );

}


/* =====================================
   SWITCH TAB
===================================== */

async function switchPersonTab(
  tabName
) {

  if (
    currentPageInfo.type !==
    "person"
  ) {

    return;

  }


  const filmography =
    currentPageInfo
      .data
      .filmography;


  const movies =
    filmography[
      tabName
    ];


  if (
    !movies
  ) {

    return;

  }


  currentPageInfo
    .data
    .activeTab =
      tabName;


  closeMoviePanel();


  await fadeOut();


  currentMovies =
    movies;


  renderMovies(
    currentMovies
  );


  resetCamera();


  renderPersonTabs();


  fadeIn();

}


/* =====================================
   CHANGE PAGE
===================================== */

async function changeMoviePage(
  movies,
  pageInfo
) {

  await fadeOut();


  currentMovies =
    movies;


  currentPageInfo =
    pageInfo;


  renderMovies(
    currentMovies
  );


  resetCamera();


  updatePersonHeader();


  updateBackButton();


  fadeIn();

}


/* =====================================
   OPEN MOVIE PAGE
===================================== */

async function openMoviePage(
  movie
) {

  if (!movie) {
    return;
  }


  if (
    singleClickTimer
  ) {

    clearTimeout(
      singleClickTimer
    );


    singleClickTimer =
      null;

  }


  closeMoviePanel();

  closeSearch();


  showLoading(
    "OPENING..."
  );


  try {

    const movies =
      await getRelatedMovies(
        movie.id
      );


    saveCurrentPage();


    await changeMoviePage(

      movies,

      {
        type: "movie",

        data: {
          movie
        }
      }

    );

  }

  catch (error) {

    console.error(
      "관련 영화 로딩 실패:",
      error
    );

  }

  finally {

    hideLoading();

  }

}


/* =====================================
   OPEN PERSON
===================================== */

async function openPersonFilmography(
  person,
  preferredTab = null
) {

  closeMoviePanel();

  closeSearch();


  showLoading(
    "LOADING FILMOGRAPHY..."
  );


  try {

    const filmography =
      await buildPersonFilmography(
        person.id
      );


    let activeTab =
      null;


    if (
      preferredTab &&
      filmography[preferredTab]?.length
    ) {

      activeTab =
        preferredTab;

    }

    else if (
      filmography.directing.length
    ) {

      activeTab =
        "directing";

    }

    else if (
      filmography.production.length
    ) {

      activeTab =
        "production";

    }

    else if (
      filmography.writing.length
    ) {

      activeTab =
        "writing";

    }

    else if (
      filmography.acting.length
    ) {

      activeTab =
        "acting";

    }


    if (
      !activeTab
    ) {

      return;

    }


    saveCurrentPage();


    await changeMoviePage(

      filmography[
        activeTab
      ],

      {
        type: "person",

        data: {

          person: {
            id: person.id,
            name: person.name
          },

          filmography,

          activeTab

        }
      }

    );

  }

  catch (error) {

    console.error(
      "필모그래피 로딩 실패:",
      error
    );

  }

  finally {

    hideLoading();

  }

}


/* =====================================
   OPEN MUSIC PERSON
===================================== */

async function openMusicFilmography(
  person
) {

  closeMoviePanel();

  closeSearch();


  showLoading(
    "LOADING MUSIC FILMOGRAPHY..."
  );


  try {

    const movies =
      await getMusicFilmography(
        person.id
      );


    if (
      movies.length === 0
    ) {

      return;

    }


    saveCurrentPage();


    await changeMoviePage(

      movies,

      {
        type:
          "music-person",

        data: {

          person: {
            id:
              person.id,

            name:
              person.name
          }

        }

      }

    );

  }

  catch (error) {

    console.error(
      "음악 필모그래피 로딩 실패:",
      error
    );

  }

  finally {

    hideLoading();

  }

}


/* =====================================
   BACK
===================================== */

async function goBack() {

  if (
    historyStack.length ===
    0
  ) {

    return;

  }


  closeMoviePanel();


  const previous =
    historyStack.pop();


  await fadeOut();


  currentMovies =
    previous.movies;


  currentPageInfo =
    previous.pageInfo;


  renderMovies(
    currentMovies
  );


  scale =
    previous.scale;


  positionX =
    previous.positionX;


  positionY =
    previous.positionY;


  updateTransform();


  updatePersonHeader();


  updateBackButton();


  fadeIn();

}


/* =====================================
   BACK BUTTON
===================================== */

function updateBackButton() {

  backButton.classList.toggle(

    "visible",

    historyStack.length >
      0

  );

}


backButton.addEventListener(
  "click",
  goBack
);


/* =====================================
   MOVIE INFO
===================================== */

function renderLimitedCredits(container, people, limit, openHandler) {
  if (!container) return;
  container.innerHTML = "";

  const unique = [];
  const seen = new Set();
  (people || []).forEach(function (person) {
    if (!person || seen.has(person.id)) return;
    seen.add(person.id);
    unique.push(person);
  });

  if (!unique.length) {
    container.textContent = "—";
    return;
  }

  const visible = unique.slice(0, limit);
  visible.forEach(function (person) {
    const button = document.createElement("button");
    button.className = "person-link";
    button.textContent = person.name;
    button.addEventListener("click", function () {
      openHandler(person);
    });
    container.appendChild(button);
  });

  if (unique.length > limit) {
    const more = document.createElement("button");
    more.className = "view-all-link";
    more.textContent = `VIEW ALL (${unique.length})`;
    more.addEventListener("click", function () {
      container.innerHTML = "";
      unique.forEach(function (person) {
        const button = document.createElement("button");
        button.className = "person-link";
        button.textContent = person.name;
        button.addEventListener("click", function () {
          openHandler(person);
        });
        container.appendChild(button);
      });
    });
    container.appendChild(more);
  }
}

async function showMovieInfo(
  movie
) {

  if (
    !movie
  ) {

    return;

  }


  activePanelMovieId =
    movie.id;


  document
    .querySelectorAll(
      ".movie.selected"
    )
    .forEach(
      function (element) {

        element.classList.remove(
          "selected"
        );

      }
    );


  const selected =
    document.querySelector(
      `.movie[data-movie-id="${movie.id}"]`
    );


  selected?.classList.add(
    "selected"
  );


  moviePanel.classList.add(
    "open"
  );


  panelTitle.textContent =
    movie.original_title ||
    movie.title ||
    "UNTITLED";


  panelMeta.textContent =
    "LOADING...";


  panelDirector.innerHTML =
    "—";


  panelCast.innerHTML =
    "";


  panelMusic.innerHTML =
    "";


  panelGenres.textContent =
    "—";

  [panelWriting, panelProduction, panelActing].forEach(function (el) {
    if (el) el.innerHTML = "—";
  });


  if (panelOverview) {
    panelOverview.textContent = "";
  }


  if (
    movie.poster_path
  ) {

    panelPoster.style.display =
      "block";


    panelPoster.src =
      TMDB_IMAGE_BASE +
      movie.poster_path;

  }

  else {

    panelPoster.style.display =
      "none";

  }


  try {

    const details =
      await getMovieDetails(
        movie.id
      );


    if (
      activePanelMovieId !==
      movie.id
    ) {

      return;

    }


    panelTitle.textContent =
      details.original_title ||
      details.title ||
      "UNTITLED";


    const year =
      details.release_date
        ? details.release_date.slice(
            0,
            4
          )
        : "—";


    const runtime =
      details.runtime
        ? `${details.runtime} MIN`
        : "";


    const language =
      details.original_language
        ? details.original_language
            .toUpperCase()
        : "";


    panelMeta.textContent =
      [
        year,
        runtime,
        language
      ]
      .filter(Boolean)
      .join(" · ");


    /* =================================
       DIRECTOR
    ================================= */

    const directors =
      details.credits
        ?.crew
        ?.filter(
          function (person) {

            return (
              person.job ===
              "Director"
            );

          }
        ) || [];


    panelDirector.innerHTML =
      "";


    if (
      directors.length
    ) {

      directors.forEach(
        function (director) {

          const button =
            document.createElement(
              "button"
            );


          button.className =
            "person-link";


          button.textContent =
            director.name;


          button.addEventListener(
            "click",
            function () {

              openPersonFilmography(
                director
              );

            }
          );


          panelDirector.appendChild(
            button
          );

        }
      );

    }

    else {

      panelDirector.textContent =
        "—";

    }


    /* =================================
       WRITING / PRODUCTION / ACTING
       3–5 people + VIEW ALL
    ================================= */

    const writingCredits = details.credits?.crew?.filter(function (person) {
      return person.department === "Writing" || ["Writer", "Screenplay", "Story", "Characters"].includes(person.job);
    }) || [];

    const productionCredits = details.credits?.crew?.filter(function (person) {
      return person.department === "Production" || ["Producer", "Executive Producer", "Co-Producer"].includes(person.job);
    }) || [];

    const actingCredits = details.credits?.cast || [];

    renderLimitedCredits(panelWriting, writingCredits, 3, openPersonFilmography);
    renderLimitedCredits(panelProduction, productionCredits, 3, openPersonFilmography);
    renderLimitedCredits(panelActing, actingCredits, 5, openPersonFilmography);

    /* =================================
       CAST
    ================================= */

    const cast =
      details.credits
        ?.cast
        ?.slice(
          0,
          8
        ) || [];


    panelCast.innerHTML =
      "";


    if (
      cast.length
    ) {

      cast.forEach(
        function (actor) {

          const button =
            document.createElement(
              "button"
            );


          button.className =
            "person-link";


          button.textContent =
            actor.name;


          button.addEventListener(
            "click",
            function () {

              openPersonFilmography(
                actor
              );

            }
          );


          panelCast.appendChild(
            button
          );

        }
      );

    }

    else {

      panelCast.textContent =
        "—";

    }


    /* =================================
       MUSIC
    ================================= */

    const musicCredits =
      details.credits
        ?.crew
        ?.filter(
          function (person) {

            return (

              person.job ===
              "Original Music Composer"

              ||

              person.job ===
              "Composer"

              ||

              person.job ===
              "Music Composer"

            );

          }
        ) || [];


    const musicIds =
      new Set();


    const musicPeople =
      musicCredits.filter(
        function (person) {

          if (
            musicIds.has(
              person.id
            )
          ) {

            return false;

          }


          musicIds.add(
            person.id
          );


          return true;

        }
      );


    panelMusic.innerHTML =
      "";


    if (
      musicPeople.length
    ) {

      musicPeople.forEach(
        function (person) {

          const button =
            document.createElement(
              "button"
            );


          button.className =
            "person-link";


          button.textContent =
            person.name;


          button.addEventListener(
            "click",
            function () {

              openMusicFilmography(
                person
              );

            }
          );


          panelMusic.appendChild(
            button
          );

        }
      );

    }

    else {

      panelMusic.textContent =
        "—";

    }


    /* =================================
       GENRE
    ================================= */

    panelGenres.textContent =
      details.genres
        ?.map(
          function (genre) {

            return genre.name;

          }
        )
        .join(" · ")
      ||
      "—";


    /* =================================
       OVERVIEW
    ================================= */

    if (panelOverview) {
      panelOverview.textContent =
        details.overview ||
        "No description available.";
    }


    /* =================================
       OST
    ================================= */

    const title =
      details.original_title ||
      details.title ||
      "";


    spotifyButton.href =
      "https://open.spotify.com/search/" +
      encodeURIComponent(
        `${title} ${year} soundtrack`
      );


    youtubeButton.href =
      "https://www.youtube.com/results?search_query=" +
      encodeURIComponent(
        `${title} ${year} official soundtrack`
      );

  }

  catch (error) {

    console.error(
      "영화 정보 로딩 실패:",
      error
    );


    if (
      activePanelMovieId ===
      movie.id
    ) {

      panelMeta.textContent =
        "FAILED TO LOAD";

    }

  }

}


/* =====================================
   CLOSE PANEL
===================================== */

function closeMoviePanel() {

  moviePanel.classList.remove(
    "open"
  );


  activePanelMovieId =
    null;


  document
    .querySelectorAll(
      ".movie.selected"
    )
    .forEach(
      function (element) {

        element.classList.remove(
          "selected"
        );

      }
    );

}


closePanelButton.addEventListener(
  "click",
  closeMoviePanel
);


/* =====================================
   SEARCH UI
===================================== */

function openSearch() {

  searchBox.classList.add(
    "open"
  );


  setTimeout(
    function () {

      searchInput.focus();

    },
    50
  );

}


function closeSearch() {

  searchBox.classList.remove(
    "open"
  );

}


searchButton.addEventListener(
  "click",
  openSearch
);


closeSearchButton.addEventListener(
  "click",
  closeSearch
);


/* =====================================
   EXECUTE SEARCH
===================================== */

async function executeSearch() {

  const query =
    searchInput.value.trim();


  if (
    !query
  ) {

    return;

  }


  showLoading(
    "SEARCHING..."
  );


  try {

    const [movies, people] =
      await Promise.all([
        searchMovies(query),
        searchPeople(query)
      ]);


    const personMatch =
      findBestPersonMatch(
        people,
        query,
        movies
      );


    if (personMatch) {

      await openPersonFilmography(
        personMatch,
        getPreferredPersonTab(personMatch)
      );

      return;

    }


    saveCurrentPage();


    closeMoviePanel();


    await changeMoviePage(

      movies,

      {
        type:
          "search",

        data: {
          query
        }
      }

    );


    closeSearch();

  }

  catch (error) {

    console.error(
      "검색 실패:",
      error
    );

  }

  finally {

    hideLoading();

  }

}


searchInput.addEventListener(
  "keydown",
  function (event) {

    if (
      event.key ===
      "Enter"
    ) {

      executeSearch();

    }


    if (
      event.key ===
      "Escape"
    ) {

      closeSearch();

    }

  }
);


/* =====================================
   SINGLE CLICK
===================================== */

viewport.addEventListener(
  "click",
  function (event) {

    if (
      didDrag
    ) {

      return;

    }


    const element =
      event.target.closest(
        ".movie"
      );


    if (
      !element
    ) {

      return;

    }


    const movie =
      findMovieById(

        Number(
          element.dataset.movieId
        )

      );


    if (
      !movie
    ) {

      return;

    }


    if (
      singleClickTimer
    ) {

      clearTimeout(
        singleClickTimer
      );

    }


    singleClickTimer =
      setTimeout(
        function () {

          showMovieInfo(
            movie
          );


          singleClickTimer =
            null;

        },
        SINGLE_CLICK_DELAY
      );

  }
);


/* =====================================
   DOUBLE CLICK
===================================== */

viewport.addEventListener(
  "dblclick",
  function (event) {

    if (
      didDrag
    ) {

      return;

    }


    if (
      singleClickTimer
    ) {

      clearTimeout(
        singleClickTimer
      );


      singleClickTimer =
        null;

    }


    const element =
      event.target.closest(
        ".movie"
      );


    if (
      !element
    ) {

      return;

    }


    const movie =
      findMovieById(

        Number(
          element.dataset.movieId
        )

      );


    if (
      !movie
    ) {

      return;

    }


    openMoviePage(
      movie
    );

  }
);


/* =====================================
   DRAG
===================================== */

viewport.addEventListener(
  "mousedown",
  function (event) {

    if (
      event.button !==
      0
    ) {

      return;

    }


    isDragging =
      true;


    didDrag =
      false;


    viewport.classList.add(
      "dragging"
    );


    startMouseX =
      event.clientX;


    startMouseY =
      event.clientY;


    startPositionX =
      positionX;


    startPositionY =
      positionY;

  }
);


window.addEventListener(
  "mousemove",
  function (event) {

    if (
      !isDragging
    ) {

      return;

    }


    const moveX =
      event.clientX -
      startMouseX;


    const moveY =
      event.clientY -
      startMouseY;


    const distance =
      Math.sqrt(
        moveX * moveX +
        moveY * moveY
      );


    if (
      distance >
      DRAG_THRESHOLD
    ) {

      didDrag =
        true;

    }


    positionX =
      startPositionX +
      moveX;


    positionY =
      startPositionY +
      moveY;


    updateTransform();

  }
);


window.addEventListener(
  "mouseup",
  function () {

    if (
      !isDragging
    ) {

      return;

    }


    isDragging =
      false;


    viewport.classList.remove(
      "dragging"
    );


    setTimeout(
      function () {

        didDrag =
          false;

      },
      120
    );

  }
);


/* =====================================
   ZOOM
===================================== */

viewport.addEventListener(

  "wheel",

  function (event) {

    event.preventDefault();


    const oldScale =
      scale;


    if (
      event.deltaY <
      0
    ) {

      scale *=
        1.08;

    }

    else {

      scale /=
        1.08;

    }


    scale =
      Math.min(
        Math.max(
          scale,
          0.25
        ),
        2.5
      );


    const worldMouseX =
      (
        event.clientX -
        positionX
      ) /
      oldScale;


    const worldMouseY =
      (
        event.clientY -
        positionY
      ) /
      oldScale;


    positionX =
      event.clientX -
      worldMouseX *
      scale;


    positionY =
      event.clientY -
      worldMouseY *
      scale;


    updateTransform();

  },

  {
    passive: false
  }

);


/* =====================================
   BLOCK IMAGE DRAG
===================================== */

document.addEventListener(
  "dragstart",
  function (event) {

    if (
      event.target.tagName ===
      "IMG"
    ) {

      event.preventDefault();

    }

  }
);


/* =====================================
   HOME
===================================== */

async function loadHome() {

  showLoading(
    "LOADING MOVIES..."
  );


  try {

    currentMovies =
      await getHomeMovies();


    currentPageInfo = {
      type:
        "home",

      data:
        null
    };


    renderMovies(
      currentMovies
    );


    resetCamera();


    updatePersonHeader();


    updateBackButton();

  }

  catch (error) {

    console.error(
      "HOME 로딩 실패:",
      error
    );

  }

  finally {

    hideLoading();

  }

}


/* =====================================
   START
===================================== */

loadHome();
/* =====================================
   MOBILE TOUCH / PINCH — V7
===================================== */
let touchMode = null;
let touchStartX = 0;
let touchStartY = 0;
let touchStartPositionX = 0;
let touchStartPositionY = 0;
let pinchStartDistance = 0;
let pinchStartScale = 1;
let pinchWorldX = 0;
let pinchWorldY = 0;
let lastTapTime = 0;
let lastTapMovieId = null;

function touchDistance(a, b) {
  const dx = b.clientX - a.clientX;
  const dy = b.clientY - a.clientY;
  return Math.hypot(dx, dy);
}

function touchCenter(a, b) {
  return {
    x: (a.clientX + b.clientX) / 2,
    y: (a.clientY + b.clientY) / 2
  };
}

viewport.addEventListener("touchstart", function (event) {
  if (event.touches.length === 1) {
    const t = event.touches[0];
    touchMode = "pan";
    isDragging = true;
    didDrag = false;
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartPositionX = positionX;
    touchStartPositionY = positionY;
    viewport.classList.add("dragging");
    return;
  }

  if (event.touches.length === 2) {
    event.preventDefault();
    touchMode = "pinch";
    didDrag = true;
    const a = event.touches[0];
    const b = event.touches[1];
    const center = touchCenter(a, b);
    pinchStartDistance = touchDistance(a, b) || 1;
    pinchStartScale = scale;
    pinchWorldX = (center.x - positionX) / scale;
    pinchWorldY = (center.y - positionY) / scale;
  }
}, { passive: false });

viewport.addEventListener("touchmove", function (event) {
  if (touchMode === "pinch" && event.touches.length >= 2) {
    event.preventDefault();
    const a = event.touches[0];
    const b = event.touches[1];
    const center = touchCenter(a, b);
    const ratio = touchDistance(a, b) / pinchStartDistance;
    scale = Math.min(Math.max(pinchStartScale * ratio, 0.25), 2.5);
    positionX = center.x - pinchWorldX * scale;
    positionY = center.y - pinchWorldY * scale;
    updateTransform();
    return;
  }

  if (touchMode === "pan" && event.touches.length === 1) {
    const t = event.touches[0];
    const moveX = t.clientX - touchStartX;
    const moveY = t.clientY - touchStartY;

    if (Math.hypot(moveX, moveY) > DRAG_THRESHOLD) {
      didDrag = true;
      event.preventDefault();
    }

    positionX = touchStartPositionX + moveX;
    positionY = touchStartPositionY + moveY;
    updateTransform();
  }
}, { passive: false });

viewport.addEventListener("touchend", function (event) {
  if (event.touches.length > 0) {
    if (event.touches.length === 1 && touchMode === "pinch") {
      const t = event.touches[0];
      touchMode = "pan";
      touchStartX = t.clientX;
      touchStartY = t.clientY;
      touchStartPositionX = positionX;
      touchStartPositionY = positionY;
    }
    return;
  }

  const wasDrag = didDrag;
  touchMode = null;
  isDragging = false;
  viewport.classList.remove("dragging");

  if (!wasDrag && event.changedTouches.length === 1) {
    const t = event.changedTouches[0];
    const target = document.elementFromPoint(t.clientX, t.clientY);
    const movieEl = target?.closest?.(".movie");

    if (movieEl) {
      const movieId = Number(movieEl.dataset.movieId);
      const now = Date.now();
      if (lastTapMovieId === movieId && now - lastTapTime < 330) {
        const movie = findMovieById(movieId);
        if (movie) openMoviePage(movie);
        lastTapTime = 0;
        lastTapMovieId = null;
      } else {
        lastTapTime = now;
        lastTapMovieId = movieId;
      }
    }
  }

  setTimeout(function () {
    didDrag = false;
  }, 120);
}, { passive: true });

viewport.addEventListener("touchcancel", function () {
  touchMode = null;
  isDragging = false;
  didDrag = false;
  viewport.classList.remove("dragging");
}, { passive: true });
