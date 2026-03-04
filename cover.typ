#import "modules/util.typ": *
#import "modules/activity.typ": *
#import "modules/components.typ": *
#import "modules/github.typ": *
#import "modules/solved-ac.typ": *
#import "metadata.typ": metadata

#set page(fill: color.rgb(0, 0, 0, 0))

#let theme = sys.inputs.at("theme", default: "light")
#let palette = if theme == "light" {
  (
    foreground1: color.rgb("#1f2328"),
    foreground2: color.rgb("#495057"),
    background1: color.rgb("#e6edf3"),
    link: color.rgb("#1c7ed6"),
  )
} else {
  (
    foreground1: color.rgb("#e6edf3"),
    foreground2: color.rgb("#ced4da"),
    background1: color.rgb("#1f2328"),
    link: color.rgb("#74c0fc"),
  )
}

#set page(paper: "a4", margin: 0pt)

#set text(
  font: "Pretendard",
  fill: palette.foreground1,
  features: ("ss06",),
  fallback: true,
)
#show heading: set text(size: 16pt)

#align(center)[
  = #text(size: 24pt)[#metadata.name.nickname / #metadata.name.real-korean#super[#upper[#metadata.name.real-english]]]

  #text(size: 12pt)[
    #text(weight: 900, tracking: 2pt)[#metadata.role]
    #text(weight: 600)[\@]
    #text(weight: 700, tracking: 1pt)[#metadata.location]
  ] \
  #icon("lucide/mail?color=" + palette.foreground1.to-hex())
  #link("mailto:" + metadata.email)[#metadata.email]
  $bar$
  #icon("lucide/phone?color=" + palette.foreground1.to-hex())
  #link("tel:" + metadata.phone.join())[#metadata.phone.join(" ")]

  #text(size: 16pt, weight: 600)[
    #set par(leading: 8pt)
    #metadata.bio.ko.title \ #text(size: 13pt)[#metadata.bio.en.title]
  ]

  #icon(if theme == "dark" {
    "skill-icons/github-dark"
  } else {
    "skill-icons/github-light"
  })
  #link("https://github.com/" + metadata.social.github)[\@#metadata.social.github]
  $bar$
  #icon("logos/twitter") #link("https://twitter.com/" + metadata.social.twitter)[\@#metadata.social.twitter]
  $bar$
  #icon-solved-ac() #link("https://solved.ac/profile/" + metadata.social.solved-ac)[
    #solved-ac-profile-short(metadata.social.solved-ac)
  ]
]

#line(length: 100%, stroke: 1pt + palette.foreground1)

#align(center)[
  == 기술#super[Skills]
  #for row in (
    (
      tech-list.typescript--short,
      tech-list.javascript--short,
      tech-list.css,
      tech-list.react-and-react-native,
      tech-list.nextjs,
      tech-list.solidjs,
      tech-list.tailwindcss,
      tech-list.vite,
      tech-list.tiptap,
    ),
    (
      tech-list.rust,
      tech-list.kotlin,
      tech-list.swift,
      tech-list.docker,
      tech-list.bash,
      tech-list.gradle,
      tech-list.git,
      tech-list.github,
      tech-list.github-actions,
    ),
  ) {
    set text(size: 8pt)
    enumerate(
      row.map(tech => (
        icon(
          if theme == "dark" {
            tech.at("icon-dark", default: tech.icon)
          } else {
            tech.icon
          },
          size: 16pt,
          bottom: 0pt,
        ),
        tech.label,
      )),
    )
  }
]

#workExpList(
  header: [
    == 경력#super[Work Experiences]
  ],
  (
    workExpEntry(
      from: datetime(year: 2023, month: 3, day: 20),
      to: datetime.today(),
      role: "프론트엔드 엔지니어",
      organization: "주식회사 라프텔(Laftel)",
      homepage: link("https://laftel.oopy.io")[laftel.oopy.io],
    )[
      애니메이션 OTT 서비스 라프텔에서 React와 React Native를 활용한 웹/앱 개발을 맡았습니다. 수행한 주요 업무는 다음과 같습니다.
      - Firebase를 활용한 A/B 테스트
      - react-email과 tailwindcss를 활용한 이메일 템플릿 생성 및 관리, CI 연동 작업
    ],
  ),
)

#activityList(
  header: [
    == 기타 활동#super[Other Activities]
  ],
  (
    activityEntry(
      from: datetime(year: 2025, month: 8, day: 23),
      title: [FEConf 2025 발표#super[#link("https://youtu.be/PcyA_rZmOR4")[#text(fill: palette.link)[#underline[#icon("logos/youtube-icon", width: 10.5333125pt, height: 8pt) TanStack Query 너머를 향해! 쿼리를 라우트까지 전파시키기]]]]],
    )[],
    activityEntry(
      from: datetime(year: 2023, month: 11, day: 17),
      title: belonging([해커톤 멘토 $and$ 심사위원], [쿠씨톤]),
    )[
      #link("https://kucc.co.kr/")[#text(
          fill: palette.link,
        )[#underline[KUCC]#sub[Korea University Computer Club]]]에서 주최한 2023년 쿠씨톤에서 해커톤
      멘토 및 심사위원을 맡아 Django, React, Pygame 등을 사용하는 멘티들을 서포트하고, 작품을 심사했습니다.
    ],
    activityEntry(
      from: datetime(year: 2022, month: 9, day: 20),
      title: "NYPC 2022 특별상",
    )[],
  ),
)

#activityList(
  header: [
    == 프로젝트#super[Projects]
  ],
  (
    activityEntry(
      from: datetime(year: 2025, month: 12, day: 7),
      title: pad(top: -1em / 4)[
        #grid(
          columns: (1fr, auto),
          gh-repo("RanolP/kati.nanno.space"), [ #tech-chips.typescript ],
        )
      ],
    )[ ],
    activityEntry(
      from: datetime(year: 2025, month: 12, day: 30),
      title: pad(top: -1em / 4)[
        #grid(
          columns: (1fr, auto),
          gh-repo("RanolP/blog.ranolp.dev"), [ #tech-chips.typescript ],
        )
      ],
    )[ ],
    activityEntry(
      from: datetime(year: 2025, month: 10, day: 29),
      title: pad(top: -1em / 4)[
        #grid(
          columns: (1fr, auto),
          gh-repo("RanolP/Lumo"), [ #tech-chips.typescript ],
        )
      ],
    )[ ],
    activityEntry(
      from: datetime(year: 2025, month: 8, day: 17),
      title: pad(top: -1em / 4)[
        #grid(
          columns: (1fr, auto),
          gh-repo("RanolP/coshot.ranolp.dev"), [ #tech-chips.solidjs #tech-chips.vite ],
        )
      ],
    )[ ],
    activityEntry(
      from: datetime(year: 2023, month: 10, day: 29),
      title: pad(top: -1em / 4)[
        #grid(
          columns: (1fr, auto),
          gh-repo("psl-lang/psl"), [ #tech-chips.rust ],
        )
      ],
    )[ ],
    activityEntry(
      from: datetime(year: 2022, month: 8, day: 21),
      title: pad(top: -1em / 4)[
        #grid(
          columns: (1fr, auto),
          gh-repo("RanolP/crowdin-strife"), [ #tech-chips.rust #tech-chips.mysql ],
        )
      ],
    )[ ],
    activityEntry(
      from: datetime(year: 2022, month: 1, day: 9),
      title: pad(top: -1em / 4)[
        #grid(
          columns: (1fr, auto),
          gh-repo("RanolP/measurrred"), [ #tech-chips.rust ],
        )
      ],
    )[ ],
    activityEntry(
      from: datetime(year: 2021, month: 12, day: 10),
      title: pad(top: -1em / 4)[
        #grid(
          columns: (1fr, auto),
          gh-repo("RanolP/bojodog"), [ #tech-chips.typescript #tech-chips.webpack ],
        )
      ],
    )[ ],
    activityEntry(
      from: datetime(year: 2021, month: 11, day: 27),
      title: pad(top: -1em / 4)[
        #grid(
          columns: (1fr, auto),
          gh-repo("RanolP/bojoke"), [ #tech-chips.typescript #tech-chips.vite ],
        )
      ],
    )[ ],
    activityEntry(
      from: datetime(year: 2020, month: 10, day: 9),
      title: pad(top: -1em / 4)[
        #grid(
          columns: (1fr, auto),
          gh-repo("RanolP/dalmoori-font"), [ #tech-chips.typescript ],
        )
      ],
    )[ ],
    activityEntry(
      from: datetime(year: 2020, month: 6, day: 21),
      title: pad(top: -1em / 4)[
        #grid(
          columns: (1fr, auto),
          gh-repo("solvedac/unofficial-documentation"), [ #tech-chips.openapi ],
        )
      ],
    )[ ],
  ),
)

#align(center)[
  == 오픈소스 기여#super[Open Source Contributions]
  #for (url,) in metadata.oss-contribs {
    gh-pull-req(url)
  }
  #box(width: 15cm)[
    #{
      let pulls = metadata.oss-contribs.map(((url,)) => gh-pull(url)).sorted(key: pull => (
        "none": 0,
        "OPEN": 1,
        "MERGED": 2,
        "CLOSED": 3,
      ).at(pull.at("state", default: "none")))
      let groups = pulls.map(pull => pull.at("state", default: none)).dedup()
      for group in groups.filter(group => group != none) {
        [
          #for pull in pulls.filter(pull => pull.at("state", default: none) == group) {
            [
              #gh-pull-short(
                pull,
                full: metadata.oss-contribs.find(((url,)) => url == pull.url).at("full", default: false),
              )
            ]
          } \
        ]
      }
    }
  ]
]

#align(center)[
  #text(size: 10pt, fill: palette.foreground2)[
    상기 이력은
    #datetime.today().display("[year]년 [month]월 [day]일")
    기준입니다
  ]
]
