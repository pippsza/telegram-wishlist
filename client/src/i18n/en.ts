export const en = {
  // Nav
  nav_wishes: 'Wishes',
  nav_pairs: 'Pairs',
  nav_archive: 'Archive',
  nav_settings: 'Settings',

  // My Wishes
  my_wishes: 'My Wishes',
  no_wishes: 'No wishes yet',
  no_wishes_hint: 'Add your first wish!',
  new_wish: 'New Wish',
  edit_wish: 'Edit Wish',

  // Wish form
  wish_description: 'Description',
  wish_description_placeholder: 'What do you wish for?',
  wish_link: 'Link',
  wish_link_placeholder: 'https://...',
  wish_priority: 'Priority',
  wish_tags: 'Tags',
  wish_tags_placeholder: 'Add tag...',
  wish_add_tag: 'Add',
  wish_add_photo: 'Add photo',
  wish_create: 'Create wish',
  wish_save: 'Save changes',
  wish_delete: 'Delete',
  wish_edit: 'Edit',
  wish_received: 'Received',
  wish_mark_received: 'Mark as received',
  wish_received_date: 'Received',
  wish_send_to_chat: 'Send to chat',
  wish_not_found: 'Wish not found',

  // Priority
  priority_high: 'High',
  priority_medium: 'Medium',
  priority_low: 'Low',

  // Pairs
  pairs: 'Pairs',
  no_pairs: 'No pairs yet',
  no_pairs_hint: 'Create an invite link or search by username.',
  create_invite: 'Create invite link',
  search_username: 'Search by @username...',
  send_request: 'Send request',
  incoming_requests: 'Incoming requests',
  your_pairs: 'Your pairs',
  partner_wishes: "Partner's Wishes",
  no_partner_wishes: "Your partner hasn't added any wishes yet.",

  // Invite
  invite_link: 'Invite link',
  invite_generate: 'Generate link',
  invite_share_hint: 'Share this link with the person you want to pair with.',
  invite_title: 'Pair Invitation',
  invite_description: 'Someone invited you to become wishlist partners.',
  invite_accept: 'Accept invitation',
  invite_created: 'Pair created! Redirecting...',
  invite_invalid: 'Invalid invite link',

  // Delete dialog
  delete_title: 'Delete wish',
  delete_description: 'Are you sure you want to delete this wish?',
  delete_confirm: 'Delete',
  cancel: 'Cancel',

  // Archive
  archive: 'Archive',
  no_archive: 'No received wishes yet.',
  archive_my_wishes: 'My wishes',
  archive_from_partners: 'From partners',

  // Filters
  filter_all: 'All',
  filter_search: 'Search...',
  filter_priority: 'Priority',
  filter_tags: 'Tags',

  // Settings
  settings: 'Settings',
  settings_language: 'Language',
  settings_theme: 'Theme',
  theme_light: 'Light',
  theme_dark: 'Dark',
  theme_pink: 'Pink',
  theme_green: 'Green',

  // Auth
  app_name: 'Wishlist',
  open_from_telegram: 'Please open this app from Telegram.',

  // Link label
  link: 'Link',
} as const;

export type TranslationKey = keyof typeof en;
