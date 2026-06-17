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
  wish_options: 'Options (either/or)',
  wish_options_hint: "Haven't decided? Add a few options - you want just one of them.",
  wish_or: 'or',
  wish_add_option: 'Add option',
  wish_option_label_placeholder: 'Option name',
  wish_option_price_placeholder: 'Price',
  wish_add_photo: 'Add photo',
  wish_create: 'Create wish',
  wish_save: 'Save changes',
  wish_delete: 'Delete',
  wish_edit: 'Edit',
  wish_received: 'Received',
  wish_mark_received: 'Mark as received',
  wish_received_date: 'Received',
  wish_send_to_chat: 'Send to chat',
  wish_unarchive: 'Restore',
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

  // Toast messages
  toast_wish_created: 'Wish created!',
  toast_wish_updated: 'Wish updated!',
  toast_wish_deleted: 'Wish deleted',
  toast_wish_received: 'Marked as received',
  toast_wish_unarchived: 'Wish restored',
  toast_sent_to_chat: 'Sent to chat',
  toast_pair_request_sent: 'Request sent',
  toast_pair_accepted: 'Pair created!',
  toast_pair_declined: 'Request declined',
  toast_pair_deleted: 'Pair deleted',
  toast_link_copied: 'Link copied',
  toast_error: 'Something went wrong',
  toast_logged_out: 'Logged out',

  // New features
  logout: 'Log out',
  pending_sent: 'Sent requests',
  pending_sent_link: 'Invite link',
  pending_sent_username: 'Request to user',
  delete_pair: 'Delete pair',
  delete_pair_title: 'Delete pair',
  delete_pair_description: 'Are you sure you want to remove this partner?',
  sort_newest: 'Newest',
  sort_priority: 'By priority',
  sort_alpha: 'A-Z',
} as const;

export type TranslationKey = keyof typeof en;
