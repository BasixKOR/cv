#import "modules/util.typ": *
#import "modules/activity.typ": *
#import "modules/components.typ": *
#import "modules/github.typ": *
#import "modules/solved-ac.typ": *
#import "metadata.typ": metadata

#set page(
  paper: "a4",
  margin: (top: 1.5cm, left: 1.5cm, right: 1.5cm, bottom: 1.8cm),
  header: context {
    if here().page() != 1 {
      pad(left: -0.4cm)[
        #text(
          fill: color.rgb("#575049"),
        )[
          #text(weight: 700)[#metadata.name.nickname / #metadata.name.real-korean]
          ---
          #text(weight: 600, tracking: 1pt)[#metadata.role]
          \@
          #text(weight: 600, tracking: 0.5pt)[#metadata.location]
        ]
      ]
    }
  },
  footer-descent: 0pt,
  footer: [
    #pad(left: -0.4cm, top: 0.6cm, bottom: -0.01cm)[
      #text(size: 10pt, fill: color.rgb("#575049"))[
        상기 이력은
        #datetime.today().display("[year]년 [month]월 [day]일")
        기준입니다
      ]
    ]
    #align(right)[
      #pad(
        top: -1cm,
        right: -0.5cm,
      )[
        #square(
          size: 24pt,
          fill: color.rgb("#000000"),
          stroke: none,
          radius: (top-left: 25%, top-right: 25%, bottom-left: 25%, bottom-right: 25%),
        )[
          #place(horizon + center)[
            #text(fill: color.rgb("#ffffff"), weight: 900, number-width: "tabular")[
              #context {
                counter(page).display("1")
              }
            ]
          ]
        ]
      ]
    ]
  ],
)
#set text(font: "Pretendard", features: ("ss06",), fallback: true)
#show heading: set text(size: 16pt)

= #text(size: 32pt)[#metadata.name.nickname / #metadata.name.real-korean#super[#upper[#metadata.name.real-english]]]
#text(size: 12pt)[
  #text(weight: 900, tracking: 2pt)[#metadata.role]
  #text(weight: 600)[\@]
  #text(weight: 700, tracking: 1pt)[#metadata.location]
]

#{
  set text(size: 10pt)
  grid(
    columns: (1fr, 1.5fr),
    grid(
      columns: (auto, 1fr),
      column-gutter: 16pt,
      row-gutter: 8pt,
      [#icon("lucide/mail") *전자 우편#super[Mailbox]*], link("mailto:" + metadata.email)[#metadata.email],
      [#icon("lucide/phone") *전화#super[Phone]*], link("tel:" + metadata.phone.join())[#metadata.phone.join(" ")],
    ),
    grid(
      columns: (auto, 1fr),
      column-gutter: 16pt,
      row-gutter: 8pt,
      [#icon("devicon/github") *GitHub*],
      link("https://github.com/" + metadata.social.github)[\@#metadata.social.github],

      [#icon("logos/twitter") *Twitter*],
      link("https://twitter.com/" + metadata.social.twitter)[\@#metadata.social.twitter],

      [#icon-solved-ac() *solved.ac*],
      link("https://solved.ac/profile/" + metadata.social.solved-ac)[
        #solved-ac-profile(metadata.social.solved-ac)
      ],
    ),
  )
}


#text(size: 14pt, weight: 400)[
  #set par(leading: 8pt)
  #text(size: 8pt, weight: 900, top-edge: -0pt, bottom-edge: 0pt)[
    자기소개 #sym.dash.em #text(tracking: 2pt)[INTRODUCTION]
  ] \
  #metadata.bio.ko.title \ #text(size: 10pt)[#metadata.bio.ko.body]
]

#line(length: 100%, stroke: 0.75pt)

== 기술#super[Skills]

#box(inset: (left: 8pt, top: 4pt))[
  #align(center)[
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
        row.map(tech => (icon(tech.icon, size: 16pt, bottom: 0pt), tech.label)),
      )
    }
  ]
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
      애니메이션 OTT 서비스 라프텔에서 React와 React Native를 활용한 웹/앱 개발을 맡았습니다.
      - Firebase를 활용한 A/B 테스트
      - react-email과 tailwindcss를 활용한 이메일 템플릿 생성 및 관리, CI 연동 작업
      - Next.js ISR을 활용한 Notion Database 기반 회사 블로그 구현
      - AVFoundation 및 exoplayer (media3)를 활용한 react-native용 다운로드 모듈 개선
      - 신규 프로덕트 #link("https://minam.co")[#text(fill: color.rgb("#1c7ed6"))[#underline[minam.co]]] 런칭까지 프론트엔드 단독 개발 \
        react-router 7, panda-css, i18next 등 기술 도입
      - 내부 이벤트 관리를 위한 WYSIWYG 에디터를 Tiptap 기반으로 신규 개발
      - Changeset 기반 모노레포 관리 시스템 및 pkg.pr.new 스타일 프리뷰 배포 플로우 구축
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
      title: [FEConf 2025 발표#super[#link("https://youtu.be/PcyA_rZmOR4")[#text(fill: color.rgb("#1c7ed6"))[#underline[#icon("logos/youtube-icon", width: 10.5333125pt, height: 8pt) TanStack Query 너머를 향해! 쿼리를 라우트까지 전파시키기]]]]],
    )[],
    activityEntry(
      from: datetime(year: 2023, month: 11, day: 17),
      title: belonging([해커톤 멘토 $and$ 심사위원], [쿠씨톤]),
    )[
      #link("https://kucc.co.kr/")[#text(fill: color.rgb("#1c7ed6"))[#underline[KUCC]#sub[Korea University Computer Club]]]에서 주최한 2023년 쿠씨톤에서 해커톤
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
        #gh-repo("RanolP/kati.nanno.space") #h(1fr) #tech-chips.typescript #tech-chips.duckdb
      ],
    )[ 서브컬처 행사 정보를 크롤링하고, Gemini를 활용해 정제하는 프로젝트입니다. DuckDB-WASM과 Monaco 에디터로 브라우저에서 SQL로 분석할 수 있습니다. ],
    activityEntry(
      from: datetime(year: 2025, month: 12, day: 30),
      title: pad(top: -1em / 4)[
        #gh-repo("RanolP/blog.ranolp.dev") #h(1fr) #tech-chips.typescript #tech-chips.reactrouter #tech-chips.tiptap
      ],
    )[ React Router v7 기반 개인 블로그입니다. 개발 환경에서 Tiptap 기반 WYSIWYG 편집기로 글을 작성할 수 있고, 정적 사이트로 빌드됩니다. ],
    activityEntry(
      from: datetime(year: 2025, month: 10, day: 29),
      title: pad(top: -1em / 4)[
        #gh-repo("RanolP/Lumo") #h(1fr) #tech-chips.typescript
      ],
    )[ Algebraic (co)effect, Linear Resource Calculus, Call-by-Push-Value 등 다양한 이론을 바탕으로 고수준 타입 언어를 개발하고 있습니다. ],
    activityEntry(
      from: datetime(year: 2025, month: 8, day: 17),
      title: pad(top: -1em / 4)[
        #gh-repo("RanolP/coshot.ranolp.dev") #h(1fr) #tech-chips.solidjs #tech-chips.codemirror
      ],
    )[ Twoslash를 지원하는 코드 스크린샷 도구입니다. Shiki 하이라이터를 CodeMirror 6 에디터에 연결하고, Twoslash로 타입 정보를 보존하며 스크린샷을 찍어 공유할 수 있습니다. ],
    activityEntry(
      from: datetime(year: 2023, month: 10, day: 29),
      title: pad(top: -1em / 4)[
        #gh-repo("psl-lang/psl") #h(1fr) #tech-chips.rust
      ],
    )[ 알고리즘 문제 해결에 활용하기 좋은 프로그래밍 언어를 설계하고 만들었습니다. 간단한 입출력과 사칙 연산, 반복문 및 조건문을 사용할 수
      있습니다. 컴파일 결과물로 읽기 쉬운 C 코드를 생성합니다. ],
    activityEntry(
      from: datetime(year: 2022, month: 8, day: 21),
      title: pad(top: -1em / 4)[
        #gh-repo("RanolP/crowdin-strife") #h(1fr) #tech-chips.rust #tech-chips.postgresql
      ],
    )[ Minecraft 번역 커뮤니티 사용자들이 기존 번역 및 외전 게임 텍스트를 쉽게 찾아볼 수 있도록 봇을 제작했습니다. ],
    activityEntry(
      from: datetime(year: 2022, month: 1, day: 9),
      title: pad(top: -1em / 4)[
        #gh-repo("RanolP/measurrred") #h(1fr) #tech-chips.rust
      ],
    )[
      WinAPI를 활용해 작업 표시줄에 CPU 사용량, 남은 배터리 등의 정보를 커스텀 위젯으로 보여줄 수 있는 프로그램을
      만들었습니다.
    ],
    activityEntry(
      from: datetime(year: 2021, month: 12, day: 10),
      title: pad(top: -1em / 4)[
        #gh-repo("RanolP/bojodog") #h(1fr) #tech-chips.typescript #tech-chips.webpack
      ],
    )[ VS Code 안에서 백준 온라인 저지 문제를 확인할 수 있는 간단한 VS Code 확장을 만들었습니다. ],
    activityEntry(
      from: datetime(year: 2021, month: 11, day: 27),
      title: pad(top: -1em / 4)[
        #gh-repo("RanolP/bojoke") #h(1fr) #tech-chips.typescript #tech-chips.vite
      ],
    )[ prosemirror를 활용해 백준 온라인 저지의 양식으로 문제 본문을 편집할 수 있는 WYSIWYG 에디터를 구현했습니다. ],
    activityEntry(
      from: datetime(year: 2020, month: 10, day: 9),
      title: pad(top: -1em / 4)[
        #gh-repo("RanolP/dalmoori-font") #h(1fr) #tech-chips.typescript
      ],
    )[ 한글날을 기념해 현대 한글 11,172자를 전부 지원하는 8 $times$ 8 도트풍 한글 글꼴 '달무리'를 만들었습니다. 현재 산돌 무료
      폰트 중 하나로 등재되어 있습니다. ],
    activityEntry(
      from: datetime(year: 2020, month: 6, day: 21),
      title: pad(top: -1em / 4)[
        #gh-repo("solvedac/unofficial-documentation") #h(1fr) #tech-chips.openapi
      ],
    )[ 알고리즘 문제풀이 커뮤니티, #link("https://solved.ac/")[#icon-solved-ac() #underline[#text(fill: color.rgb("#1c7ed6"))[solved.ac]]]의
      API를 비공식적으로 OpenAPI 규격에 맞게 문서화했습니다. ],
  ),
)

== 오픈소스 기여#super[Open Source Contributions]

#for (url,) in metadata.oss-contribs {
  gh-pull-req(url)
}
#{
  let pulls = metadata.oss-contribs.map(((url,)) => gh-pull(url))
  let groups = pulls.map(pull => pull.nameWithOwner).dedup()
  for group in groups.filter(group => group != none) {
    [
      - #gh-repo(group)
        #for pull in pulls.filter(pull => pull.nameWithOwner == group) {
          [
            - #gh-pull-rich(pull)
          ]
        }
    ]
  }
}
