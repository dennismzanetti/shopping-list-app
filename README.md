# ShopList

A web app for managing shopping lists, built with HTML, JavaScript, and Firebase.

---

## Regression Testing — Feature Checklist

Use the following checklist to verify core app functionality after any code change.

### 1. Authentication
- [ ] Google Sign-In button displays on the auth screen
- [ ] Clicking "Continue with Google" opens the Google OAuth flow
- [ ] Successful sign-in hides the auth screen and shows the main app
- [ ] User avatar and name appear in the header and Settings view after sign-in
- [ ] Sign Out button (Settings > Profile) signs the user out and returns to the auth screen

### 2. Navigation
- [ ] All five nav tabs render: **My Lists**, **Templates**, **Categories**, **Stores**, **Settings**
- [ ] Clicking each tab activates the correct view
- [ ] The active tab is visually highlighted
- [ ] The lists badge count in the nav updates when lists are added or removed
- [ ] Clicking the user avatar in the header navigates to Settings

### 3. My Lists
- [ ] "New List" button opens the New List modal
- [ ] List can be created with a name, optional description, emoji, stores, and visibility (Private/Public)
- [ ] Newly created list appears as a card on the My Lists grid
- [ ] Clicking a list card opens the List Detail view
- [ ] Back button in List Detail returns to My Lists
- [ ] List name, description, emoji, stores, and visibility are editable in the Detail view
- [ ] Changes to list details are saved and persisted in Firebase
- [ ] Delete List button (in Detail view) prompts a confirmation dialog before deleting
- [ ] Deleted list is removed from the grid

### 4. Items (within a List)
- [ ] "Add Item" button (top and bottom of list) opens the Add Item modal
- [ ] Item can be saved with: name, quantity, unit, store, category, and notes
- [ ] Added item appears in the items list
- [ ] Item completion checkbox toggles the item's checked/unchecked state
- [ ] Checked items display with a visual strikethrough or muted style
- [ ] Progress bar and label (e.g. "2 of 5") update as items are checked/unchecked
- [ ] Clicking an existing item opens the Edit Item modal pre-populated with its data
- [ ] Edited item reflects changes after saving
- [ ] Delete Item button (in Edit Item modal) removes the item after confirmation
- [ ] Empty state message displays when a list has no items
- [ ] Print button renders a print-friendly view of the list

### 5. Templates
- [ ] "New Template" button opens the Template Editor view
- [ ] Template can be saved with: name, description, emoji, stores, and visibility
- [ ] Template items can be added with: name, quantity, unit, category, stores, tags, and notes
- [ ] Saved template appears in the Templates grid
- [ ] Clicking a template card opens the Template Editor with existing data
- [ ] "Add to List" button (in Template Editor) opens the Add-to-List modal
- [ ] Template items can be added to an existing list or a new list by name
- [ ] Template items are successfully copied to the selected list
- [ ] Delete Template button removes the template after confirmation

### 6. Categories
- [ ] "Add Category" button opens the New Category modal
- [ ] Category can be created with a name and emoji
- [ ] Emoji picker opens when "Pick" button is clicked
- [ ] Saved category appears in the Categories grid
- [ ] Categories are available for selection in the Add/Edit Item modal
- [ ] Editing a category updates its name and/or emoji
- [ ] Deleting a category removes it from the grid and from item dropdowns

### 7. Stores
- [ ] "Add Store" button opens the New Store modal
- [ ] Store can be created with a name and emoji
- [ ] Saved store appears in the Stores grid
- [ ] Stores appear as selectable pills in: New List modal, List Detail view, Add/Edit Item modal, Template Editor
- [ ] Editing a store updates its name and/or emoji
- [ ] Deleting a store removes it from the grid and from all store-picker locations

### 8. Emoji Picker
- [ ] Emoji picker opens when the emoji button is clicked (lists, templates, categories, stores)
- [ ] Emoji search field filters the displayed emojis
- [ ] Selecting an emoji updates the associated emoji button
- [ ] Emoji picker closes when the X button or overlay is clicked

### 9. Settings
- [ ] Profile card displays signed-in user's name and email
- [ ] Dark Mode toggle switches the app between light and dark themes
- [ ] Theme preference is preserved on page reload
- [ ] Header theme toggle (sun/moon icon) also toggles dark/light mode
- [ ] **Export Data** downloads a `.json` file containing all user data (lists, items, templates, categories, stores)
- [ ] **Import Data** prompts a file picker, accepts a `.json` file, and restores data
- [ ] About card displays the 10 most recent GitHub commits (date, SHA, message)

### 10. Modals & Dialogs
- [ ] All modals open and close correctly (X button and Cancel button)
- [ ] Confirm dialog appears before any destructive delete action
- [ ] Confirming delete proceeds with the action; cancelling aborts it
- [ ] Toast notifications appear for key actions (save, delete, error)
- [ ] Toast notifications auto-dismiss after a few seconds

### 11. Data Persistence (Firebase)
- [ ] All created/updated data survives a full page refresh
- [ ] Signing out and back in restores all user data
- [ ] No duplicate records are created on repeated saves

---

## Tech Stack

- **Frontend:** HTML5, CSS3 (custom design tokens), Vanilla JavaScript (ES Modules)
- **Backend / Database:** Firebase Firestore
- **Auth:** Firebase Authentication (Google Sign-In)
- **Icons:** Lucide Icons
- **Fonts:** Satoshi (Fontshare)
