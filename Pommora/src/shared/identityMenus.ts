// The identity-chrome native menus' action vocabulary — the nexus icon/title/banner menus, the
// Space header menu, and the icon picker's favorite toggle. One home for the unions both
// processes speak. No fs, no React.

export type NexusIconAction = 'changeIcon' | 'addPhoto' | 'removePhoto' | 'removeIcon'

export type TitleMenuAction = 'rename' | 'editIcon' | 'toggleIcon' | 'changeColor'

export type BannerMenuAction = 'change' | 'remove'

export type IconFavoriteMenuAction = 'toggle'
