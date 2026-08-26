import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { Avatar } from '../../shared/ui/avatar/avatar';
import { Icon } from '../../shared/ui/icon/icon';
import { NavItem } from '../../shared/ui/nav-item/nav-item';
import { PodiumRank, PodiumSlot } from '../../shared/ui/podium-slot/podium-slot';
import { Select, SelectOption } from '../../shared/ui/select/select';
import { SideNav } from '../../shared/ui/side-nav/side-nav';

interface Podium {
  rank: PodiumRank;
  name: string;
  points: string;
  avatarUrl: string;
  winRate?: number;
  matches?: number;
  isSelf?: boolean;
}

interface RankingRow {
  position: number;
  name: string;
  tier: string;
  tournaments: number;
  points: string;
  avatarUrl: string;
  isSelf?: boolean;
}

@Component({
  selector: 'app-global-ranking-page',
  imports: [Avatar, Icon, NavItem, PodiumSlot, Select, SideNav],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './global-ranking-page.html',
})
export class GlobalRankingPage {
  protected readonly filterOptions: SelectOption[] = [
    { value: 'all', label: 'All tournaments' },
    { value: 'history', label: 'History Olympiad' },
    { value: 'science', label: 'Science Challenge' },
    { value: 'math', label: 'Math Logic' },
  ];
  protected filter = signal('all');

  protected readonly podium: Podium[] = [
    {
      rank: 2,
      name: 'Sofia Mendez',
      points: '11,820',
      winRate: 78,
      matches: 142,
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDp6z9Ql2C0kEBWFli5yQ0cYnSeajwTlmkmbIF_g11oBA8kG2i3wW9OeWcczbtGQazvcv66yP4xl2RFL3dBnemD86Kyj8vXWgIxZ_OjZcI0fNO8uVgRROQOpOpXeDY92MzqEAedHoc6rXzQWx0crZQ0Pd13FVQkxThCSUzI8fHMa8TW7_x6rpZWSZiKZVezsBwVJOOVMzRmEeguGC8DsLjAhyIYmP3RG-yR5TG97kt5AEVQo0U3DJwd',
    },
    {
      rank: 1,
      name: 'Alejandro Silva',
      points: '12,450',
      isSelf: true,
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAbgejTp9sBCKO3bWDyA-XsYJGVE1tpH70iTRM9jv4-JA8CDl0Y0cZJX4QNbLQjDgvNPxOcEofo6JySG0tjzW1pk9-yVAMX-bFPPXoYny6HHbmturTv2yLVdeFAbOcTvtJHUcQwPvJMWFstEsfUF4CgLOhkJ_4mroSeArAv9_1LCc3hIXvLIfKC1dc2hDYGRzsyfs7KlQiQJQjXL-MNihdjx8djt7-oIeH4YsXSFyep_pOlXmzUtOe2',
    },
    {
      rank: 3,
      name: 'Mateo Ruiz',
      points: '10,500',
      winRate: 65,
      matches: 110,
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBzxuBhd0Yc57W-9m9CWxTG2ILQK_US9x1mA3dMX5HM5IcNi_Le9Cc6y82XiiSwyIHWwCAVqrzj532jm56UV2LGsLRDxX0XzdTLluBGDzEWuy_zsVyjneRk_k04IAx5lF2yPmXngd03MU0s96EtzEpTOnsTIUxCpYmfJu5YOEtRepcOw7mUrpV035QGHXlU5eDOxQEVKEOTb-HfkUdtTtOJPPAgpdyLaDzyQLgjqd6fMBV65n9QYCa9',
    },
  ];

  protected readonly rows: RankingRow[] = [
    {
      position: 4,
      name: 'Elena Torres',
      tier: 'Master',
      tournaments: 98,
      points: '9,850',
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDYnUizlQtfSZ_JiixOFIfogKJQdT_5igJ2h6CJbC3HOrECmlbwNchr_hzGVc8glSlDqCAOMaA9QTH0Y9mxVfTEQqtqODE8RJKW--qpcfbSY6DAiknbcLTGJPfOJY-qo-WK6MqcvOvdi_VGYoKbRWeivsG_fDUvODQBr6FXUhEEtLVrNROX9y7jNeHt8Leso50_zgnSVehdtgOgPrkq6a6VW5alU4plKCQXn8RbINR5nJE9njutvLSW',
    },
    {
      position: 5,
      name: 'Luis Gómez',
      tier: 'Master',
      tournaments: 105,
      points: '9,620',
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBW01RNh9Yt41UazmgKrA68UdCwTcZy8cEBz5frUI2y3AuZpzOJLjoueIpMSEYOtH1gikEJMdsORk936nJu1vss4rbnw0PaSlh5KjhycfGS7-E3U9-Jjdrhzh00FxuoLp-sdmPV7Ii0-blNjjt68zvYv5zNkMsuPbpMtrvKLLzP08veAP0NBM93LG8hnQjRDyv95BLGtmnxENwKAY_J3fsIn5J2hUzl3fgsNRS1MhhehrWsEx-zKxTv',
    },
    {
      position: 6,
      name: 'Carla Diaz',
      tier: 'Diamond',
      tournaments: 87,
      points: '9,410',
      avatarUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCDt_UybnWrI_FTEpLyh5DZFLw89vwDNNmiXDmEOeIIBlI8JN-HA8Y-H8MOmisn_etpBunJdIebD3HKe7BSjS1hcod4hDbL56RluW59i_5EX1Wt-bWPqwAN6-MC3DCdA5nVtW39EckufMBMhL1sNXhyAd_aB5aGCNAmA5sAQXFEdzinBXB2J58YRNDLZWQ6FkmcDDJ7t-sUKm8ruGHQMTirRp4siEOFccLHktPW8KPY4zZ5eeCNeSvi',
    },
  ];

  protected readonly selfRow: RankingRow = {
    position: 1,
    name: 'Alejandro Silva',
    tier: 'Grandmaster',
    tournaments: 156,
    points: '12,450',
    isSelf: true,
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAXfDoVd6pnfy8N1Td69eKpHnKfU1zgSDM7EaewkH9ygcIHItsANelL4O025AOgtNLlNkc5JKlelYNRpQnEIl-9lYqkrsSTUySxDfYVfEoD1mtjdqOVvncRiIEERshmgQpWWHE_2JuW5acv0WXqYvZ0b7iPFDZeIANmsaKyHL39AGO-v6Ow5B_ou14CTIGfrmStCCh4CsgJI0uGdecXAVI_MWEhnlfedaRvH-1wbbStGBR3SvpdpL6T',
  };
}
