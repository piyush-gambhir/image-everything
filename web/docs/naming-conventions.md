## Summary - Naming Conventions

The table below summarises the naming conventions by category, with examples:

| **Element**               | **Naming Style**                                      | **Example**                                                                                      |
| ------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **File Names**            | **kebab-case** (lowercase, hyphens)                   | `user-profile.tsx` (✅) `UserProfile.tsx` (❌)                                                   |
| **Folder Names**          | **kebab-case** (lowercase, hyphens)                   | `user-profile/` directory e.g. `dashboard-settings/`                                             |
| **React Components**      | **PascalCase** (upper camel case)                     | `UserProfile` component in code (e.g. `function UserProfile() {...}`)                            |
| **Variables**             | **camelCase** (lowercase start)                       | `let userProfileData = ...`                                                                      |
| **Constants**             | **UPPER_SNAKE_CASE** (all caps, underscores)          | `const API_BASE_URL = "...";`                                                                    |
| **Functions**             | **camelCase** (usually a verb phrase)                 | `function fetchUserData() {...}`                                                                 |
| **Custom Hooks**          | **camelCase** with `use` prefix                       | `function useAuth() {...}` (must start with "`use`")                                             |
| **CSS Classes**           | **kebab-case** (Tailwind utilities or custom classes) | Tailwind example: `bg-blue-500` Custom class: `.btn-primary`                                     |
| **Types & Interfaces**    | **PascalCase** (no `I` prefix)                        | `interface UserProfileProps { ... }` ([TypeScript Naming Conventions: Crafting Maintainable Code |
| **Environment Variables** | **UPPER_SNAKE_CASE** (all caps, underscores)          | `API_BASE_URL = "...";`                                                                          |
| **Query Parameters**      | **snake_case**                                        | `/users?page_number=2&sort_by=name`                                                              |
| **Local Storage Keys**    | **camelCase** (optional prefix)                       | `localStorage.setItem('userSettings', ...)`                                                      |
| **Session Storage Keys**  | **camelCase** (optional prefix)                       | `sessionStorage.setItem('currentSessionId', ...)`                                                |
| **Cookies**               | **camelCase** (optional prefix, security flags)       | `document.cookie = "sessionId=abc123; path=/; Secure; HttpOnly";`                                |

---

## File and Folder Naming

**Convention:** Use **kebab-case** (all lowercase with hyphens between words) for all file and directory names. For example, a component file should be named `user-profile.tsx` rather than `UserProfile.tsx` or `userProfile.tsx` Likewise, folders should be named `user-profile/` instead of `UserProfile/`.

**Reasoning:** Kebab-case file/folder names are recommended for cross-platform consistency and URL friendliness. Lowercase names avoid issues on case-sensitive systems (e.g. Linux) and prevent confusion on case-insensitive systems (e.g. Windows). In Next.js (which uses file/folder names for routing), this convention also makes route URLs predictable and SEO-friendly. For instance, a page file named `user-settings.tsx` will produce a route `/user-settings` using hyphens, which is easier to read and favored by search engines over camelCase or underscores. Consistent lowercase naming across the project improves navigation for the team and reduces errors when importing files (since exact casing must match).

**Examples:**

- Files: `dashboard.tsx`, `user-profile.tsx`, `auth-provider.tsx` (✅ all kebab-case).
- Folders: `components/`, `pages/`, `order-history/`, `reset-password/` (all lowercase).
- **Avoid** mixing styles: e.g. having some files in PascalCase and others in kebab-case will lead to inconsistency. For example, do not have `UserProfile.tsx` alongside `data-table.tsx` in the same folder. Choose one style (here we use kebab-case) and apply it uniformly.

**Notes:** In Next.js, dynamic route files use bracket notation (e.g. `[userId].tsx`). Use lowercase for the parameter name inside brackets, and prefer descriptive names like `[userId]` over generic `[id]` for clarity. Folder names in the Next.js `app/` directory follow the same kebab-case pattern (e.g. an `analytics/` folder yields `/analytics` route). The special Next.js files (like **`_app.tsx`**, **`_document.tsx`**) are lowercase by framework convention.

## React Component Names

**Convention:** Use **PascalCase** for all React component names. Each word in the component’s name is capitalized (e.g. `UserProfile`, `ResetPasswordForm`). This applies to both functional components and any class components (if used). The component’s filename (as above) will be kebab-case, but the component’s exported name should be PascalCase, matching typical React conventions.

**Reasoning:** PascalCase makes components easily distinguishable from regular JavaScript variables or HTML tags. React mandates that component names start with a capital letter so that JSX can recognize them as components. By capitalizing each word, we improve readability (“UserProfile” is clearer than “userprofile”) and signal that the entity is a component (much like a class or constructor in traditional OOP). This is standard practice in the React community and in our internal UI design system; for example, a design system button component might be named `PrimaryButton` or `ButtonLarge` in code, clearly standing out from native HTML elements.

**Examples:**

- In code: `export default function **UserProfile**() { ... }` and usage `<UserProfile />`.
- Component instances in JSX appear with capitalized tag names, e.g. `<DashboardSidebar />`, `<ModalDialog />`.
- **Avoid** naming a component with a lowercase first letter (e.g. `function userProfile()`) – React will treat `<userProfile />` as a DOM tag, which is not intended.

## Variables and Constants

**Variables (mutable or single-assignment):** Use **camelCase** for variable names, including local variables, function parameters, and object properties. In camelCase, the first letter is lowercase and each subsequent word is capitalized (e.g. `userName`, `isLoggedIn`). This is the standard JavaScript style for variables and aligns with common style guides. It makes variable names readable without the visual weight of underscores or all-caps. Use descriptive nouns or noun phrases for variable names that reflect their purpose.

**Constants (immutable values meant as configuration):** Use **UPPER_SNAKE_CASE** for constants that represent fixed values or configuration (e.g. `MAX_RETRY_COUNT`, `API_BASE_URL`). All letters are uppercase, with words separated by underscores . This convention immediately signals that the value is a constant that should not be reassigned. It’s typically applied to constants that are module-level or global (e.g. environment variables, app settings). For constants scoped within a function (not exported), you may still use camelCase if they are short-lived, but for any constant that is exported or widely used, UPPER_SNAKE_CASE is preferred for clarity.

**Reasoning:** CamelCase for variables is widely adopted in JavaScript/TypeScript because it blends words without extra characters, improving readability and consistency. Constants in all-caps stand out and follow long-standing conventions from many languages indicating immutability. By separating constants from regular variables in style, developers can instantly recognize config values or compile-time constants. This reduces the chance of accidentally modifying them and clarifies intent.

**Examples:**

- Variable: `let totalItems = cart.items.length;`
- Constant: `const DEFAULT_THEME = "light";`
- Object property: `user.fullName` (camelCase as well – JavaScript object keys usually follow the same style as variables unless constrained by external data format).
- **Avoid:** Unnecessary Hungarian notation or prefixes. E.g., do not name a number variable `nUserCount` or a boolean `bIsEnabled` – just use `userCount`, `isEnabled`. Also avoid ALL_CAPS for things that aren’t constant values (reserve it for true constants).

## Function and Hook Naming

**Functions:** Use **camelCase** for naming functions, with names usually starting with a verb to indicate action. For example: `calculateTotal()`, `fetchUserData()`, `handleClick()`. Functions follow the same casing as variables (since they are often assigned to variables or object properties). The camelCase format is easy to read and is consistent with how built-in JavaScript methods (e.g. `array.forEach`) are named. If the function returns a boolean, a common convention is to start with `is`, `has`, or `should` (e.g. `isValid()`), indicating a true/false return. Overall, choose clear, descriptive verbs or verb phrases.

**Custom React Hooks:** A special case of functions, custom Hooks **must** start with the prefix `"use"` and then follow with a capitalized word, keeping the whole name in camelCase form (e.g. `useAuth`, `useUserProfile`, `useDataFetcher`). This `"use"` prefix is required by React’s Hooks rules and linter – it signals to React that this function obeys Hook conventions. After the prefix, we treat the rest of the hook name like any function name (camelCase). For instance, if a hook provides authentication logic, `useAuth` or `useAuthStatus` are appropriate names.

**Reasoning:** CamelCase is standard for functions for the same reasons as for variables: consistency and readability. Starting function names with verbs makes code self-documenting (you can tell what the function _does_). For Hooks, the `use` prefix is a React best practice: it clearly differentiates hooks from regular functions at a glance. Seeing `useSomething` tells developers (and linter tools) that the function likely calls other Hooks internally and should be used as a Hook. This prevents incorrect usage; for example, if you see a function named `getData()` inside a component, you know it’s _not_ a Hook and thus it shouldn’t call `useState` or other Hooks inside it. The consistent naming also makes it easier to search for all custom hooks by filtering on the `use` prefix.

**Examples:**

- Regular function: `function **sendWelcomeEmail**(user) { ... }`
- Hook function: `function **useUserProfile**() { ... }` (and usage: `const profile = useUserProfile();`).
- Arrow function assigned to variable: `const **formatDate** = (date) => { ... };` – still camelCase name.
- **Avoid:** Starting a non-hook function with “use”. Only Hooks should have that prefix to avoid confusion. Conversely, **do not** omit the `use` prefix on actual Hooks (a custom hook named `authState()` would violate the rule; it should be `useAuthState()`)

## CSS Class Naming (Tailwind CSS Context)

We use Tailwind CSS, which primarily provides utility classes out-of-the-box. These utility classes (like `text-center`, `bg-red-500`, `md:px-4`) are already **kebab-case** (lowercase with hyphens) as part of Tailwind’s design. **Use Tailwind classes directly wherever possible** rather than inventing new class names, since Tailwind utilities are consistent and expressive.

If you need to define custom CSS classes (for example, in the global CSS or in the Tailwind configuration’s `@layer components` for repeated style patterns or design system theming), **use kebab-case** naming for those classes as well. Hyphen-separated lowercase names are the CSS standard for multi-word classes. For instance, you might define a reusable button style class like `.btn-primary` or a card variant class like `.card-featured` in your CSS – these follow the lowercase-hyphen pattern. Keep custom class names semantic and concise, possibly indicating their scope or variant (e.g. prefixing `btn-` for button-related classes as in `.btn-base`, `.btn-primary` etc. to group them by context.

**Reasoning:** Kebab-case is the conventional format for CSS classes, and Tailwind already uses it extensively. Sticking to this format for any custom classes maintains consistency with Tailwind and avoids confusion. It also ensures that classes remain URL-safe and avoids potential issues (since class names may appear in compiled CSS). By using semantic, hyphenated class names for custom styles, we make the markup readable — for example, `<div class="card-base card-featured">` clearly indicates a base card component with a featured variant. Consistency here also helps when scanning HTML/JSX – all classes (whether default Tailwind or custom) look similar in style, blending into one system of naming.

**Examples:**

- Using Tailwind utilities: `<div class="**bg-gray-100 p-4 text-center**">...</div>` – all classes are kebab-case by Tailwind convention.
- Defining custom component classes (if needed): In `globals.css` or a Tailwind component layer:
  ```css
  .btn-primary {
    @apply bg-blue-600 px-4 py-2 font-bold text-white;
  }
  ```
  Then usage: `<button class="btn-primary">Save</button>`. Both the class name and any variant names (`.btn-secondary`, etc.) are lowercase-hyphenated.
- **Avoid:** camelCase or PascalCase in class selectors (e.g. `.<code>PrimaryButton</code>` in CSS) – this is not standard and will confuse developers. Also avoid overly abbreviated class names that aren’t immediately clear (e.g. `.hdr-wgt` for “header widget” is less clear than `.header-widget`). Tailwind’s utility classes are short but standardized; follow that lead for any custom names.

**Note:** If using CSS Modules (scoped CSS files) for some components, you may notice that in the JSX you import styles as objects and use properties like `styles.titleBar`. In the CSS module file, you can still define the class as `.title-bar` (kebab-case) or you might use camelCase (`.titleBar`) knowing it will be transformed. Our preference is to use kebab-case in the CSS file for consistency, and then refer to it as `styles["title-bar"]` in JSX if needed. But this is a minor detail – the key is consistency and clarity in whatever approach is chosen.

## Query Parameters

**Convention:** Query parameters—used to filter, sort, and paginate data in API requests—should use **snake_case**. For multi‐word names, separate words with underscores (e.g., `page_number`, `sort_by`).

**Reasoning:**  
Research and best practices in RESTful API design (e.g., guidelines referenced by several API design blogs and tutorials show that snake_case is preferred in query strings because URLs are typically lowercase and underscore separators improve readability and consistency. It also avoids potential issues when mixing case in URL parameters.

**Examples:**

- `/users?page_number=2&sort_by=name`
- `/products?search_term=shoes`

**Guidelines:**

- Be descriptive (e.g., use `search_term` rather than a single letter like `q`).
- Ensure parameters use URL-safe characters.
- Resource names in the URL path should be plural and use kebab-case (e.g., `/users`).

## Local Storage Keys (camelCase with optional prefix)

**Convention:**  
For keys in the browser’s local storage, use **camelCase**.

**Reasoning:**  
Front-end development best practices indicate that using camelCase for local storage keys (which often mirror JavaScript variable naming) improves consistency within the codebase. This is supported by multiple developer guides and community recommendations.

**Examples:**

- `localStorage.setItem('userSettings', JSON.stringify(settings));`
- `localStorage.setItem('accessToken', token);`

**Guidelines:**

- Keep key names descriptive but concise.
- Use a consistent prefix (like your application’s name) to prevent conflicts with other sites on the same domain.

## Session Storage Keys (camelCase with optional prefix)

**Convention:**  
Similar to local storage, session storage keys should use **camelCase** with an optional application prefix (e.g., `currentSessionId`, `lastVisitedPage`).

**Reasoning:**  
Since session storage is also accessed via JavaScript and its keys are often used alongside local storage, using camelCase ensures a uniform naming style across client-side storage.

**Examples:**

- `sessionStorage.setItem('currentSessionId', sessionId);`
- `sessionStorage.setItem('lastVisitedPage', '/home');`

**Guidelines:**

- Use names that reflect the temporary nature of the stored data.
- Prefix keys to avoid collisions, especially in complex applications.

## Cookies (camelCase with optional prefix)

**Convention:**  
Cookie names should use **camelCase** with an optional prefix. This helps distinguish your cookies from those set by other domains or applications (e.g., `myApp_sessionId`, `myApp_userPreferences`).

**Reasoning:**  
While cookies can technically be named using various conventions, many modern guides and security recommendations favor camelCase—especially when paired with specific security prefixes like `__Secure-` or `__Host-` when using HTTPS. This approach is endorsed by several security and development best practice articles

**Examples:**

- `document.cookie = "sessionId=abc123; path=/; Secure; HttpOnly";`
- `document.cookie = "userPreferences=darkMode=true; path=/; Secure";`

**Guidelines:**

- Keep cookie names short and descriptive.
- Use security flags (e.g., `Secure`, `HttpOnly`) and appropriate path/domain settings.
- Optionally add security prefixes (`__Secure-`, `__Host-`) if your application is served over HTTPS.

## Environment Variables for Next.js Frontend

**Convention:** Use **UPPERCASE with underscores** for environment variable names, i.e., **SCREAMING_SNAKE_CASE**. Environment variables should be descriptive, all caps, with words separated by underscores. For example: NEXT_PUBLIC_API_URL, NEXT_PUBLIC_GOOGLE_ANALYTICS_ID.

- **Format:** All letters uppercase; use underscores (\_) to separate logical words. Avoid hyphens or spaces as environment variables typically cannot contain those. Keep the names alphanumeric and use underscores. For instance: NEXT_PUBLIC_STRIPE_KEY or NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN. This keeps them easy to spot and consistent across systems.
- **Naming:** Prefix environment variables that are exposed to the client (accessible in the browser) with `NEXT_PUBLIC_`. This helps to distinguish them from server-only variables. For example, use `NEXT_PUBLIC_API_URL` for frontend API configuration and `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` for analytics, instead of just `API_URL` or `GOOGLE_ANALYTICS_ID`.
- **Examples:** In a Next.js app's `.env.local` or `.env` (if using a package like dotenv), you might have:
  - `NEXT_PUBLIC_API_URL=https://api.example.com` (exposed to the frontend to configure the API URL).
  - `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID=UA-123456-1` (for Google Analytics tracking ID, accessible on the frontend).
  - `NEXT_PUBLIC_STRIPE_KEY=pk_test_...` (for Stripe public key, needed on the frontend).
  - `DATABASE_URL=postgres://user:pass@localhost:5432/mydb` (used in server-side code, not exposed to the frontend).
  - `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token` (for Mapbox integration on the frontend).
- **Consistency:** Use the same naming style for all environment variables. If one has a prefix like `NEXT_PUBLIC_`, ensure it is used consistently for any other variable that should be exposed to the frontend. For example, always use `NEXT_PUBLIC_API_KEY` if your frontend uses an API key, and avoid using `API_KEY` without the prefix, as that would make it inaccessible on the frontend.
- **Server-Side Variables:** For environment variables that should only be available on the server (e.g., database credentials, secret keys), **do not** use the `NEXT_PUBLIC_` prefix. These variables should be used in your server-side code (e.g., API routes, `getServerSideProps`), but not exposed to the client. For example:
  - `DATABASE_URL=postgres://...` for database connection info.
  - `SESSION_SECRET=your-session-secret` for server-side session management.
- **Expose Only What’s Necessary:** For security, ensure that sensitive keys like API keys, passwords, and session secrets are kept server-side and not exposed to the frontend unless explicitly required (like public API keys). For example, don’t expose a `SECRET_API_KEY` to the frontend unless it’s a public key.
- **Best Practices for Variables:**
  - Use logical names: `NEXT_PUBLIC_WEBSITE_URL`, `NEXT_PUBLIC_SUPPORT_EMAIL`, etc.
  - Avoid vague names like `URL` or `KEY` on their own. Always provide context, such as `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_AUTH_KEY`.
  - Keep your `.env` file organized, grouping similar types of environment variables (e.g., all API-related vars together).

**Rationale:** Using all caps with underscores for environment variables is a standard convention that provides visual distinction between environment configuration and regular code. It improves readability and maintainability, making it clear which variables are part of the environment configuration, especially when shared across systems. Consistently following this naming convention helps avoid issues like typos and ensures that the configuration is easily identifiable and documented. Additionally, by using the `NEXT_PUBLIC_` prefix for frontend-accessible variables, Next.js automatically makes these variables available on the client-side while keeping server-side variables secure.

## TypeScript Types and Interfaces

**Interfaces and Type Aliases:** Use **PascalCase** for naming TypeScript interfaces and types. For example: `interface UserProfile { ... }`, `type OrderStatus = "pending" | "shipped" | "delivered";`. Each word is capitalized, just like with classes or components. **Do not** prefix interface names with “I” or suffix with “Interface” – e.g. use `User` instead of `IUser`, unless you have a very specific reason. Modern TypeScript style guides encourage naming interfaces in plain PascalCase without an “I” prefix. The name should be a noun or noun phrase that describes the entity or contract being modeled (e.g. `UserProfile`, `OrderDetails`, `AuthenticationContext`). This makes interfaces and types read naturally in code.

**Classes:** Although our frontend is primarily functional, if you define any classes (for example, an Error class or a utility class), use PascalCase as well (e.g. `class DataFetcher { ... }`). Classes by convention in JavaScript use PascalCase to denote a constructor or type.

**Enums:** Use PascalCase for enum names and all-uppercase or PascalCase for enum members, depending on context. For instance:

```ts
enum UserRole {
  ADMIN,
  MODERATOR,
  USER,
}
// or
enum Color {
  Red,
  Green,
  Blue,
}
```

If the enum values represent constant flags, all caps can be used (`ADMIN`), whereas if they are more like proper nouns, PascalCase is acceptable. In either case, the enum itself is PascalCase (`UserRole`, `Color`).

**Type Generics:** For generic type parameters (like `<T>`), single capital letters (T, U, V) are common when the meaning is obvious. If the generic’s purpose is not obvious by single letter, use a descriptive capitalized name (e.g. `interface ApiResponse<DataType> { ... }`). Prefixing with `T` (like `TData`) is also seen in some codebases for clarity. Ensure generic type names are clear in context.

**Reasoning:** PascalCase for types and interfaces aligns with their role as _types_ in the code (similar to classes). They define shapes or contracts, which conceptually are like blueprints, so we treat their names like proper nouns. This differentiates them from variables or functions in camelCase. Avoiding the `I` prefix keeps names clean and avoids Hungarian notation baggage – since TypeScript can distinguish types from values, there is no need to prepend an `I` to interfaces. (For example, `User` can be an interface while `UserService` might be a class – context and suffix clarify usage without special prefixes.) Descriptive naming of types and interfaces helps communicate their intent, especially important in a complex SaaS codebase where data shapes (e.g. `BillingInfo`, `UserSettings`) should be immediately understood. Consistency here also helps when generating documentation or using tools, as all types will sort nicely and be identifiable by name.

**Examples:**

- Interface: `interface **AccountSettings** { theme: string; twoFactorEnabled: boolean; }`
- Type alias: `type **PaymentMethod** = "credit_card" \| "paypal";`
- Using an interface for props: `interface **DashboardProps** { user: UserProfile; data: DataPoint[]; }` – note the interface name `DashboardProps` combines the component name with a suffix to indicate its purpose. This is a common pattern for naming component props types.
- **Avoid:** `interface IUser { ... }` (the `I` is unnecessary), or `type user_type = {...}` (snake_case or lowercase for a type is unconventional – use PascalCase). Also avoid extremely generic names like `Data` or `Options` for an interface unless it’s truly generic; prefer to be specific (e.g. `UserData`, `ChartOptions`).

---

## Folder Structure Conventions

A consistent project structure goes hand-in-hand with naming conventions. Below are typical directories in a Next.js SaaS project and guidelines on naming within each:

### **`/components` Directory**

The `components/` folder holds reusable components. Organize and name files here by component or feature:

- **Component file names:** Use the kebab-case file naming rule. For single components, a file might be `modal-dialog.tsx` exporting a `ModalDialog` component. If a component is composed of sub-components or has related files (styles, tests), you can group them in a subfolder. For example, `components/UserProfile/` could contain `index.tsx` (the main component), `user-profile.module.css` (CSS module for styling that component), and maybe `UserProfile.test.tsx`. The folder name would be `user-profile` (kebab-case to match the component name in lowercase). Alternatively, flatten structure for simpler components.
- **Naming components themselves:** Each component inside is PascalCase as discussed. Ensure the exported component name matches the file name logically. For instance, `components/alert-banner.tsx` should export (and default-export) a component named `AlertBanner`. This makes it easy to find the component implementation from usage.
- **Sub-folders by feature or category:** If you have many components, consider grouping by feature or UI domain. For instance, `components/forms/` for form-related components, `components/dashboard/` for dashboard-specific ones. These subfolder names should also be lowercase (e.g. `forms/`, `dashboard/`). Within them, files still kebab-case (e.g. `login-form.tsx`, `stats-widget.tsx`). This approach keeps the hierarchy clean.
- **Internal design system components:** If your custom UI library components are in this folder (or perhaps a separate `components/ui/` subfolder), treat them the same: PascalCase component names, kebab-case filenames. E.g. a design system Button might live in `components/ui/button.tsx` exporting `Button`. If the design system is in a separate package, follow its naming schemes, but generally they also use PascalCase for component names.

**Example structure:**

```plaintext
/components
   ├── common/
   │    ├── button.tsx          (exports Button)
   │    ├── modal-dialog.tsx    (exports ModalDialog)
   │    └── button.module.css   (styles for Button, optional)
   ├── dashboard/
   │    ├── stats-widget.tsx    (exports StatsWidget)
   │    └── stats-widget.module.css
   └── forms/
        ├── login-form.tsx      (exports LoginForm)
        └── login-form.module.css
```

In the above, folder and file names are all lowercase/kebab-case. The component names (Button, ModalDialog, StatsWidget, LoginForm) are PascalCase. This consistency makes it easy to locate a component file given its name in JSX and vice-versa.

### **`/pages` Directory**

Next.js’s `pages/` directory is used for routing. Each file here (or subfolder with a file) becomes a route. Naming conventions for pages are crucial for both clarity and SEO:

- **Page file names:** Use lowercase and hyphens for multi-word page names. The URL path is derived from the file name, so if you have a page file `pages/user-profile.tsx`, the route will be `/user-profile`. Using kebab-case ensures the URL has hyphens, which are more SEO-friendly than camelCase or spaces. For example, prefer `order-history.tsx` (route `/order-history`) over `OrderHistory.tsx` (which would generate `/OrderHistory` – not ideal) or `orderHistory.tsx` (Next would likely still route `/orderHistory`, which has a mix of cases in URL).
- **Dynamic routes:** Next.js uses `[param]` syntax for dynamic routes. Keep the placeholder name lowercase (e.g. `[orderId].tsx`). Choose meaningful placeholder names to indicate what the parameter is (e.g. `[orderId]` instead of just `[id]`, if you have multiple different ids). For nested dynamic segments or catch-all routes, follow the same principle (`[...slug].tsx` for catch-all, etc., all lowercase within brackets).
- **File vs folder:** If a page has sub-routes or needs to be a directory (to include API routes or dynamic segments), use a folder. For example, you might have `pages/dashboard/settings.tsx` for `/dashboard/settings` or using the new App Router (see below) a nested folder structure. In the `pages` folder (Next.js Pages Router), typically you do not create many subfolders except for grouping or if you want to co-locate API routes or dynamic routes. When you do, those folders also should be lowercase. Next’s special files like `_app.tsx`, `_document.tsx`, and API route files under `pages/api/` should remain as given (they start with underscore or are named by function, e.g. `hello.ts` under `api/`). Follow Next.js conventions for those (usually they are lowercase or exactly specified).

**Example pages naming:**

```plaintext
/pages
   ├── index.tsx            (homepage, route "/")
   ├── about-us.tsx         (route "/about-us")
   ├── pricing.tsx          (route "/pricing")
   ├── user-profile.tsx     (route "/user-profile")
   ├── [projectId]/
   │    ├── index.tsx       (dynamic route "/:projectId")
   │    └── settings.tsx    (nested route "/:projectId/settings")
   └── api/
        └── auth.ts         (API route "/api/auth")
```

All page filenames are lowercase. The dynamic folder `[projectId]` is lowercase inside brackets. The resulting URLs are clean and predictable. This convention improves search engine optimization and user-friendliness by producing URLs that use hyphen separators and no uppercase characters.

### **`/app` Directory (Next.js App Router)**

If your project uses Next.js 13+ App Router (the optional `app/` directory instead of `pages/`), the structure and naming follow a similar principle with some differences:

- In `app/`, each folder typically represents a route segment, and inside it you have a `page.tsx` (and optionally `layout.tsx`, `loading.tsx`, etc.). Name each route folder in **lowercase kebab-case** to produce clean URLs, and use `page.tsx` as the file for the component (Next.js mandates the filename `page.tsx` for the route's component). For example, `app/dashboard/settings/page.tsx` will correspond to `/dashboard/settings`. The folders `dashboard` and `settings` are lowercase.
- Dynamic routes in App Router use bracket folders. E.g. `app/[userId]/page.tsx` for `/[userId]` dynamic route. Again, use lowercase and meaningful names (`[userId]`, `[slug]`, etc.).
- The components defined in `page.tsx` files should be PascalCase (as normal for components). Often, you might not export them by name (Next uses the default export), but you can still name the function inside, e.g. `function ProfilePage() { ... } export default ProfilePage;`. The name isn't critical to Next, but good for debugging and consistency.
- Any co-located components (not part of the route itself) inside the app folders should follow the component and file naming conventions (PascalCase component, kebab-case file). You might create a subfolder for components used only in that route. For example: `app/dashboard/settings/SettingsForm.tsx` (file might be `settings-form.tsx` if following kebab-case) that is imported by the page.

The App Router encourages organizing by feature, so you might end up with more subfolders. Ensure each is named clearly in lowercase. This alignment with Next.js routing conventions ensures no surprises – the folder name is the URL segment, so our lowercase naming keeps URLs consistent.

### **`/styles` Directory**

The `styles/` folder typically contains global styles, CSS resets, or Tailwind CSS setup files:

- **Global stylesheets:** Often a file like `globals.css` or `global.css` is used for site-wide CSS (including Tailwind’s base imports). We use lowercase names for these files. For example, Next.js default uses `styles/globals.css`. Keep that naming. If you have other global or theme CSS files, name them clearly (e.g. `tailwind.css` for Tailwind imports, `theme-light.css` for a light theme overrides). Use kebab-case or all lowercase with possibly a dash if needed (`reset.css`, `fonts.css` etc.).
- **CSS Modules:** If using CSS module files for specific components, they often live alongside the component or in `styles/`. Name them after the component they style. For consistency with our file naming, you can use kebab-case matching the component file. For example, a `Button` component defined in `button.tsx` can have a CSS module file `button.module.css` (all lowercase like the component file). This is a slight deviation from some practices where people might name it `Button.module.css` to match the component’s PascalCase; however, using lowercase `button.module.css` aligns with our file naming rule and is acceptable. The import in the component doesn’t change (you can do `import styles from './button.module.css';`). The key is to keep the names aligned and unique.
- **Sass/SCSS files:** If you use SCSS, similar rules apply (.scss extension, but file name still lowercase). E.g. `styles/variables.scss`, `styles/mixins.scss` for Sass utility files.
- **Tailwind config file:** The Tailwind configuration (usually `tailwind.config.js` or `.ts`) should remain with that exact name (by convention). It’s all lowercase. Other config files like `postcss.config.js` too – those are already lowercase.

In summary, treat the styles directory files as regular files: all lowercase naming, and descriptive of their contents.

Sure, here's the updated documentation for both `utils` and `lib` directories based on your use case:

### **`/utils` Directory**

The `utils/` directory contains general utility functions created for the core functionality of the application. These are custom-written functions that help with tasks like formatting, data manipulation, and business logic. The files in this directory are non-React, pure logic modules.

- **File naming:** Use kebab-case for util filenames. For example: `date-formatters.ts`, `api-helpers.ts`, `string-utils.ts`. These files typically export functions or constants. If a utility file exports a single main function, name the file after that function (e.g. `format-date.ts` exporting `formatDate()`), using hyphens as needed. If a file groups related utilities, name it by the category (e.g. `auth-helpers.ts` containing multiple auth-related functions).
- **JavaScript vs TypeScript:** Prefer writing utilities in TypeScript (`.ts`) for type safety, especially in a TypeScript project. If the util file doesn’t involve JSX, use `.ts` extension. This helps catch errors early. For legacy utilities written in JavaScript (.js), migrate them gradually while ensuring naming consistency aside from the extension.
- **Organization:** You can organize the utils into subfolders if there are many (e.g. `utils/date/format.ts`, `utils/date/parse.ts`, etc.). Subfolder names should be lowercase. For small to medium projects, keep all utility files directly under `utils/` or group them into broad categories like `utils/api/`, `utils/formatters/`. Use `index.ts` files to re-export if it helps simplify imports.

**Example:**

```plaintext
/utils
   ├── date-formatters.ts    (functions to format dates)
   ├── array-helpers.ts      (array utility functions)
   ├── api-client.ts         (setup for API calls, e.g. a fetch wrapper)
   └── validation/
         ├── index.ts        (re-export all validators)
         ├── email-validator.ts
         └── password-validator.ts
```

In code, you can import utilities like `import { formatDate } from '@/utils/date-formatters';`.

### **`/lib` Directory**

The `lib/` directory is reserved for utility functions specifically designed for third-party libraries or external services. These utilities are used to integrate and interact with services or APIs that your project relies on, such as analytics, WAS (Web Analytics Services), and other external dependencies.

- **File naming:** Similar to the `utils/` directory, use kebab-case for filenames (e.g. `analytics.ts`, `was-wrapper.ts`). These files contain helper functions that make it easier to interact with external libraries and services. Keep the naming consistent with the purpose of the integration.
- **JavaScript vs TypeScript:** If you are integrating with third-party libraries, prefer writing utilities in TypeScript (`.ts`) to ensure type safety. If you have legacy JavaScript files (`.js`), consider migrating them to TypeScript gradually. Ensure naming consistency across all files, and only differ in extensions.
- **Organization:** As with `utils/`, you can organize `lib/` into subfolders based on the third-party services being integrated. For example, you might have `lib/analytics/` or `lib/was/` for specific integrations. For smaller projects, keeping everything under `lib/` might suffice.

**Example:**

```plaintext
/lib
   ├── analytics.ts          (integration with analytics service)
   ├── was-wrapper.ts        (wrapper functions for WAS service)
   └── third-party/
         ├── index.ts        (re-export all third-party utilities)
         ├── google-analytics.ts
         └── mixpanel.ts
```

In code, you can import external library helpers like `import { trackEvent } from '@/lib/analytics';`.

### **`/hooks` Directory**

The `hooks/` directory contains custom React hooks (besides any small hooks that might live alongside components if they are only used there). Naming in this folder follows the function/hook rules but with attention to file naming:

- **File naming:** As with other files, use kebab-case. For consistency, you can include the "use" prefix in the filename or not. We recommend to **include** it for clarity. For example `use-auth.ts` or `use-auth.tsx` (if the hook returns JSX or uses JSX internally; most hooks return values, not JSX, so `.ts` is sufficient). Another example: `use-user-profile.ts`. Including "use" keeps the file aligned with the hook name. An alternative some projects use is to drop "use" in file name (e.g. `auth.ts` for a hook `useAuth`), but that can be confusing. Instead, name the file exactly what the hook is (in kebab form): `use-auth.ts` exporting `useAuth`.
- **Hook naming (in code):** As stated, start with `use` and follow camelCase. The portion after `use` typically describes what it does or returns (e.g. `useAuth` for authentication status, `useUserProfile` to fetch/use user profile data). Ensure each custom hook has a clear purpose and name reflecting it.
- **Examples:**
  - `hooks/use-toggle.ts` exporting `function useToggle(initial = false) { ... }` – a hook for toggling boolean state.
  - `hooks/use-fetch-data.ts` exporting `function useFetchData(endpoint) { ... }`.
  - If multiple related hooks, you can group (e.g. an `auth/` subfolder for auth-related hooks like `useAuth`, `useAuthGuard` etc., each file still kebab-case).
- **Note:** If a hook is only used by one component or closely tied to a feature, it could live near that component (e.g. in the `components/feature/` folder). But if placed in `hooks/`, it's meant to be reusable across the app.

All the rationales for hook naming (use prefix, camelCase) as discussed earlier apply here. The directory just helps collect them.

### **`/context` or `/providers` Directory**

This directory is for React Context objects and their provider components. Some projects name it `context/` (singular or plural) and others `providers/`. Either is fine as long as it’s consistent. The purpose is to house global or shared state logic via React Context API.

- **Context files:** If each context is self-contained, a typical pattern is one file per context. For example, `AuthContext` could be defined in `auth-context.tsx`. In that file, you might create the context, define a provider component, and export a hook to use the context. The file name should describe the context (kebab-case as usual). In this case, `auth-context.tsx` (the `.tsx` since it likely contains JSX to render a Provider component). The context object and provider inside would be named in PascalCase: e.g. `const AuthContext = React.createContext(...);` and `function AuthProvider({children}) { return <AuthContext.Provider value={...}>{children}</AuthContext.Provider>; }`. Both `AuthContext` and `AuthProvider` are capitalized.
- **Provider components:** If you separate provider components into their own files (some do), name them similarly. For instance, you might have `auth-provider.tsx` (as shown in an earlier exampl which exports `AuthProvider`. In many cases, the context and provider are in one file, so you might not need separate files. But if you do separate, ensure the names are clearly related.
- **Multiple contexts:** Use distinct names. E.g. `theme-context.tsx` for theme, `user-context.tsx` for user data context, etc. Inside each, the context variable would be `ThemeContext`, `UserContext`, etc., and providers `ThemeProvider`, `UserProvider`. The hooks to consume them could be named `useTheme` or `useUser` – these hooks would follow the hook naming convention (camelCase with use prefix) and could live in the same file or in the `hooks/` directory. It’s fine to keep a small `useX` hook in the context file for convenience (e.g. `function useTheme() { return useContext(ThemeContext); }`).

**Examples:**

```plaintext
/context
   ├── auth-context.tsx        (contains AuthContext and AuthProvider)
   ├── theme-context.tsx       (contains ThemeContext and ThemeProvider)
   └── settings-context.tsx    (contains SettingsContext and SettingsProvider + maybe hook)
```

Or using a `providers/` naming:

```plaintext
/providers
   ├── auth-provider.tsx       (exports AuthProvider, defines AuthContext inside)
   ├── auth-provider.test.tsx  (test for auth provider, if any)
   └── ...
```

In either case, file names are lowercase (`auth-context.tsx`). The Context and Provider names in code are PascalCase (like classes or components). We treat context objects similar to components in naming because they are used in JSX (as `<AuthContext.Provider>`) and are capitalized by React convention as well.

**Reasoning:** Contexts and providers manage global state, and naming them clearly is important. PascalCase for context and provider identifiers (AuthContext, AuthProvider) differentiates them from variables and follows React’s convention of capitalizing anything that is a component or a context (context values are not components, but the `.Provider` that comes off them is used in JSX, so having the base context capitalized is sensible). Using a consistent suffix like `...Context` and `...Provider` in names helps identify their roles. File names with those terms (in kebab-case) make it easy to search the codebase for context definitions.

## Mixing JavaScript and TypeScript Files

In a codebase that gradually transitions from JavaScript to TypeScript (or uses both), some files may be `.js/.jsx` and others `.ts/.tsx`. Here are best practices to manage this mix while maintaining consistency and safety:

- **Prefer TypeScript for new code:** Whenever possible, write new modules in TypeScript. This provides type safety. You can have TypeScript and JavaScript side by side – TypeScript is a superset of JavaScript, so it can import JS modules easily. Next.js supports mixed environments; it will compile both. Over time, aim to convert JavaScript files to TypeScript for a more uniform codebase.
- **File extensions:** Use the correct extensions. `.tsx` for files that include JSX (React components), `.ts` for plain TS files (utilities, etc.), and `.js/.jsx` for legacy files or those not yet converted. Do **not** rename a file to `.ts` without actually adding types/adjusting it, as that could introduce errors. Conversely, don’t keep a file as `.js` if you’ve added TypeScript syntax in it – change it to `.ts/.tsx`. Keeping the extensions accurate helps tooling and prevents confusion.
- **Consistent naming and import paths:** Continue to follow the naming conventions regardless of extension. A file remains kebab-case whether it’s `.js` or `.ts`. When importing, **do not include the file extension in import statements**. Import by module path (e.g. `import fetchData from '@/utils/api-client';` not `api-client.ts`). This way, if you later switch a file from .js to .ts or vice versa, you won’t have to change import statements. The module resolution in Next/Node will pick up the correct file automatically.
- **Enable `allowJs` in tsconfig (if not already):** If your project started with TypeScript via Next.js, this might be enabled by default. This setting allows the TypeScript compiler to include .js files in the compilation process. It won't type-check the JS, but it will let you import them. Ensure this is on if you have mixed files, so that builds don’t fail on recognizing .js files.
- **Type safety for JS imports:** When you import a JavaScript module into a TypeScript file, by default its types are `any` (since no type info is present). This can undermine type safety. To mitigate this:
  - If possible, **add TypeScript definitions** for the module. This could mean converting the file to TS, or writing a `.d.ts` declaration file for it, or even using JSDoc comments in the JS file to provide type hints.
  - If conversion is planned soon, you might accept the temporary `any` (or use `// @ts-ignore` for a quick fix), but these should be eliminated over time.
  - For third-party JS libraries without types, consider adding `@types/` packages or a custom type declaration.
- **Gradual migration approach:** A recommended practice is to convert files one by one. You can rename a `.js` file to `.ts` or `.tsx`, fix any type errors that appear by adding appropriate type annotations, and proceed. Start with core modules that many others depend on (to maximize type coverage benefits), or leaf modules that are easy to test in isolation. There are tools that can assist in migration by inferring JSDoc or doing minimal conversions, but manual conversion ensures understanding of the code.
- **Consistency in style:** Even if some files remain JavaScript, continue to write code in them as if they were typed (e.g. use JSDoc for function signatures or follow the same naming patterns). The naming conventions in this guide apply equally to JavaScript files. For instance, a constant in a JS file should still be named `API_BASE_URL` not `ApiBaseUrl`, and a function should still be `camelCase`. Keeping the style uniform prevents the JS portions from deviating into a different coding style.

**Example scenario:** Suppose you have a legacy `utils/calc.js` that exports a function `calcTotal(a, b)`. If a new TypeScript file imports it, e.g. `import { calcTotal } from '@/utils/calc'`, it will work, but `calcTotal` will be of type `any` (implicit). As a short-term, you might write a quick declaration `declare function calcTotal(a: number, b: number): number;` to use it safely, or better, convert `calc.js` to `calc.ts` and add the type signature in implementation. Additionally, ensure `calc.js` adheres to naming conventions (perhaps rename to `calculate-total.ts` when converting, to fit kebab-case and clarity).

**Testing mixed code:** If you have tests (say in Jest) running, ensure they handle both .js and .ts. Usually Next.js sets up Babel to handle both. Just be aware to update import paths in tests if file names change.

In summary, mixing .js and .ts is fully supported – **TypeScript will compile alongside JavaScript** – but aim for convergence on TypeScript. Until then, uphold the same naming standards in both, avoid extension-specific import issues (no file extensions in import paths), and gradually introduce types to the untyped parts for consistency.

## Conclusion

Adhering to these naming conventions will result in a codebase that is **predictable, readable, and maintainable**. New team members should find it easy to navigate files and understand code purpose from names alone. Consistency in naming (from files and folders to variables and types) reduces cognitive load and errors:

- **Consistency:** By using the same patterns everywhere (e.g. kebab-case for all files, PascalCase for all components/types, camelCase for all functions/variables), we eliminate guesswork. A developer can infer that `payment-history.tsx` contains a `PaymentHistory` component, or that `use-payment.ts` exports a hook called `usePayment`, without opening the file – just by naming convention.
- **Clarity:** Good naming reflects intent. We choose descriptive names (within reason of length) so that the purpose is clear. This extends to choosing the right words (for instance, prefer `getUserDetails()` over `fetchStuff()` – be specific but concise).
- **Avoiding Pitfalls:** The guide’s conventions are designed to avoid common issues: e.g. lowercase file names to dodge deployment case-sensitivity bugs, `use` prefix on hooks to satisfy React’s rules, hyphenated URLs for better SEO, and so on. Following these rules keeps the project robust.

As the project grows, continue to enforce these conventions in code reviews and automated linters/formatters if possible. Many linters (ESLint, etc.) can be configured to warn on naming deviations (for example, enforcing hook naming, or preventing uppercase filenames). Leverage those to keep the codebase clean.

By embracing this naming convention guide, we can ensures that the React/Next.js application remains **scalable and developer-friendly**, with each name carrying meaning and each part of the project neatly organized.

Happy coding!

---

## References

Here’s your list with duplicates removed and formatted as a **non-ordered list with links**:

- [TailwindCSS Naming Conventions Guide](https://tillitsdone.com/blogs/tailwindcss-naming-conventions/)
- [Naming Conventions in React for Clean & Scalable Code](https://www.sufle.io/blog/naming-conventions-in-react)
- [Next.js Component Naming Conventions: Best Practices](https://dev.to/vikasparmar/nextjs-component-naming-conventions-best-practices-for-file-and-component-names-39o2)
- [Next.js 15 App Router SEO Comprehensive Checklist](https://dev.to/simplr_sh/nextjs-15-app-router-seo-comprehensive-checklist-3d3f)
- [All Caps Constants in JavaScript and Imports](https://stackoverflow.com/questions/34732630/all-caps-constants-in-javascript-and-requireds-and-imports)
- [Reusing Logic with Custom Hooks – React](https://react.dev/learn/reusing-logic-with-custom-hooks)
- [TypeScript Naming Conventions: Crafting Maintainable Code](https://aykhanhuseyn.medium.com/typescript-naming-conventions-crafting-maintainable-code-7d872234fe17)
- [Combining TypeScript and JavaScript Together](https://www.optimum-web.com/can-you-use-typescript-and-javascript-together-how-to-combine-the-two/)
- [Can .js and .tsx Files Work Together in Next.js?](https://www.reddit.com/r/nextjs/comments/vzdkqe/can_js_and_tsx_files_work_together_in_next/)
