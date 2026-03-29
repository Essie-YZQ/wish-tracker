import { db } from './firebase.js';
import { doc, getDoc, updateDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

async function loadFromFirebase() {
  const docRef = doc(db, "shared_state", "main");
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();

    console.log("Firebase data:", data);

    const state = get_state();

    if (typeof data.sBalance === "number") {
      state.users[0].wish_balance = data.sBalance;
    }

    if (typeof data.kkBalance === "number") {
      state.users[1].wish_balance = data.kkBalance;
    }

    if (typeof data.poolBalance === "number") {
      state.pool_balance = data.poolBalance;
    }

    save_state(state);
    render_app();
  } else {
    console.log("No such document!");
  }
}

function subscribeToFirebaseBalances() {
  const docRef = doc(db, "shared_state", "main");

  onSnapshot(docRef, (docSnap) => {
    if (!docSnap.exists()) {
      console.log("No such document!");
      return;
    }

    const data = docSnap.data();
    console.log("Realtime Firebase data:", data);

    const state = get_state();

    if (typeof data.sBalance === "number") {
      state.users[0].wish_balance = data.sBalance;
    }

    if (typeof data.kkBalance === "number") {
      state.users[1].wish_balance = data.kkBalance;
    }

    if (typeof data.poolBalance === "number") {
      state.pool_balance = data.poolBalance;
    }

    save_state(state);
    render_app();
  });
}





async function getLatestStateFromFirebase() {
  const state = get_state(); 
  const docRef = doc(db, "shared_state", "main");
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();

    if (typeof data.sBalance === "number") {
      state.users[0].wish_balance = data.sBalance;
    }

    if (typeof data.kkBalance === "number") {
      state.users[1].wish_balance = data.kkBalance;
    }

    if (typeof data.poolBalance === "number") {
      state.pool_balance = data.poolBalance;
    }
  }

  return state;
}

async function saveBalancesToFirebase(state) {
  const docRef = doc(db, "shared_state", "main");

  const payload = {
    sBalance: state.users[0].wish_balance,
    kkBalance: state.users[1].wish_balance,
    poolBalance: state.pool_balance
  };

  console.log("About to save balances:", payload);

  await updateDoc(docRef, payload);

  const verifySnap = await getDoc(docRef);
  console.log("Firebase after save:", verifySnap.data());
}


const storage_key = "wish_tracker_app_state";
const total_wishes = 30;

const sample_users = [
  {
    user_id: "s",
    name: "S",
    wish_balance: 0,
    total_earned: 0,
    total_spent: 0,
    habits: [
      { habit_id: "s_study", habit_name: "study", display_name: "Study", icon: "📚", target_per_week: 3, reward_value: 1 },
      { habit_id: "s_sleep_early", habit_name: "sleep_early", display_name: "Sleep Early", icon: "🌙", target_per_week: 7, reward_value: 1 },
      { habit_id: "s_workout", habit_name: "workout", display_name: "Workout", icon: "💪", target_per_week: 2, reward_value: 1 },
      { habit_id: "s_cooking", habit_name: "cooking", display_name: "Cooking", icon: "🍜", target_per_week: 3, reward_value: 1 },
      { habit_id: "s_drink_water", habit_name: "drink_water", display_name: "Drink Water", icon: "💧", target_per_week: 7, reward_value: 1 },
      { habit_id: "s_dry_hair", habit_name: "dry_hair", display_name: "Dry Hair", icon: "💁🏻‍♀️", target_per_week: 3, reward_value: 1 },
      { habit_id: "s_practice_violin", habit_name: "practice_violin", display_name: "Practice Violin", icon: "🎻", target_per_week: 2, reward_value: 1 },
      { habit_id: "s_foot_soak", habit_name: "foot_soak", display_name: "Foot Soak", icon: "♨️", target_per_week: 3, reward_value: 1 }
    ]
  },
  {
    user_id: "kk",
    name: "KK",
    wish_balance: 0,
    total_earned: 0,
    total_spent: 0,
    habits: [
      { habit_id: "kk_workout", habit_name: "workout", display_name: "Workout", icon: "💪", target_per_week: 2, reward_value: 1 },
      { habit_id: "kk_study", habit_name: "study", display_name: "Study", icon: "📚", target_per_week: 3, reward_value: 1 },
      { habit_id: "kk_reduce_smoking", habit_name: "reduce_smoking", display_name: "Reduce Smoking", icon: "🚭", target_per_week: 7, reward_value: 1 },
      { habit_id: "kk_didi", habit_name: "didi", display_name: "Didi", icon: "☺️", target_per_week: 1, reward_value: 1 },
      { habit_id: "kk_sleep_early", habit_name: "sleep_early", display_name: "Sleep Early", icon: "🌙", target_per_week: 7, reward_value: 1 }
    ]
  }
];

document.addEventListener("DOMContentLoaded", init_app);

function init_app() {
  // Seed demo data once, then render entirely from localStorage-backed state.
  initialize_storage();
  bind_events();
  render_app();
}

function initialize_storage(force_reset = false) {
  if (!force_reset && localStorage.getItem(storage_key)) {
    return;
  }

  save_state(create_initial_state());
}

function create_initial_state() {
  const week_start_date = get_week_start_date(new Date());

  return {
    week_start_date,
    pool_balance: total_wishes,
    pool_added_this_week: 0,
    last_action: null,
    ui_message: "",
    message_user_id: null,
    users: sample_users.map((user) => create_user_state(user, week_start_date))
  };
}

function create_user_state(user, week_start_date) {
  return {
    user_id: user.user_id,
    name: user.name,
    wish_balance: user.wish_balance,
    total_earned: user.total_earned,
    total_spent: user.total_spent,
    weekly_transfer_icons: [],
    habits: user.habits.map((habit) => create_habit_state(habit, week_start_date))
  };
}

function create_habit_state(habit, week_start_date) {
  const week_dates = get_week_dates(week_start_date);
  const daily_status = {};

  week_dates.forEach((date_value) => {
    daily_status[date_value] = false;
  });

  return {
    habit_id: habit.habit_id,
    habit_name: habit.habit_name,
    display_name: habit.display_name,
    icon: habit.icon || "○",
    target_per_week: habit.target_per_week,
    reward_value: habit.reward_value,
    week_start_date,
    daily_status,
    done_count: 0,
    is_reward_claimed: false,
    earned_at: null
  };
}

function bind_events() {
  document.addEventListener("click", handle_click);
}

function handle_click(event) {
  const toggle_button = event.target.closest("[data_action='toggle_day'], [data-action='toggle_day']");
  const action_button = event.target.closest("[data_action='wish_action'], [data-action='wish_action']");
  const reset_button = event.target.closest("#reset_demo_button");

  if (toggle_button) {
    console.log("toggle_button found");
    toggle_habit_day(
      toggle_button.dataset.userId,
      toggle_button.dataset.habitId,
      toggle_button.dataset.dateValue
    );
    return;
  }

  if (action_button) {
    console.log("wish_action clicked", action_button.dataset.actionType || action_button.dataset.action_type);
    perform_balance_action(
      action_button.dataset.action_type || action_button.dataset.actionType,
      action_button
    );
    return;
  }

  if (reset_button) {
    initialize_storage(true);
    render_app();
  }
}

function get_state() {
  const raw_state = localStorage.getItem(storage_key);
  const parsed_state = raw_state ? JSON.parse(raw_state) : null;
  const current_week_start = get_week_start_date(new Date());

  if (!parsed_state || state_requires_reset(parsed_state)) {
    const reset_state = create_initial_state();
    save_state(reset_state);
    return reset_state;
  }

  // When the calendar week changes, carry balances forward and reset only weekly habit progress.
  if (parsed_state.week_start_date !== current_week_start) {
    const refreshed_state = rollover_to_current_week(parsed_state, current_week_start);
    normalize_balances(refreshed_state);
    save_state(refreshed_state);
    return refreshed_state;
  }

  normalize_balances(parsed_state);
  return parsed_state;
}

function save_state(state) {
  normalize_balances(state);
  localStorage.setItem(storage_key, JSON.stringify(state));
}

function state_requires_reset(state) {
  if (!state || !Array.isArray(state.users) || state.users.length !== sample_users.length) {
    return true;
  }

  return sample_users.some((sample_user, user_index) => {
    const saved_user = state.users[user_index];

    if (!saved_user || saved_user.user_id !== sample_user.user_id || saved_user.name !== sample_user.name) {
      return true;
    }

    if (!Array.isArray(saved_user.habits) || saved_user.habits.length !== sample_user.habits.length) {
      return true;
    }

    return sample_user.habits.some((sample_habit, habit_index) => {
      const saved_habit = saved_user.habits[habit_index];

      return (
        !saved_habit ||
        saved_habit.habit_id !== sample_habit.habit_id ||
        saved_habit.habit_name !== sample_habit.habit_name ||
        saved_habit.display_name !== sample_habit.display_name ||
        saved_habit.icon !== sample_habit.icon ||
        saved_habit.target_per_week !== sample_habit.target_per_week
      );
    });
  });
}

function normalize_balances(state) {
  state.pool_added_this_week = Math.max(0, Number(state.pool_added_this_week) || 0);
  state.last_action = state.last_action || null;
  state.ui_message = typeof state.ui_message === "string" ? state.ui_message : "";
  state.message_user_id = typeof state.message_user_id === "string" ? state.message_user_id : null;

  state.users.forEach((user) => {
    user.wish_balance = Math.max(0, Number(user.wish_balance) || 0);
    user.total_earned = Math.max(0, Number(user.total_earned) || 0);
    user.total_spent = Math.max(0, Number(user.total_spent) || 0);
    user.weekly_transfer_icons = Array.isArray(user.weekly_transfer_icons) ? user.weekly_transfer_icons : [];
  });

  const total_user_balance = state.users.reduce((sum, user) => sum + user.wish_balance, 0);
  state.pool_balance = Math.max(0, total_wishes - total_user_balance);
}

function rollover_to_current_week(state, current_week_start) {
  return {
    ...state,
    week_start_date: current_week_start,
    pool_added_this_week: 0,
    last_action: null,
    ui_message: "",
    message_user_id: null,
    users: state.users.map((user) => ({
      ...user,
      habits: user.habits.map((habit) => create_habit_state(habit, current_week_start))
    }))
  };
}

function render_app() {
  const state = get_state();
  render_summary(state);
  render_week_label(state.week_start_date);
  render_trackers(state);
  render_actions(state);
}

function render_summary(state) {
  const summary_section = document.getElementById("summary_section");
  const person_a = state.users[0];
  const person_b = state.users[1];
  const person_a_weekly_earned = get_weekly_earned_display(person_a);
  const person_b_weekly_earned = get_weekly_earned_display(person_b);

  summary_section.innerHTML = `
    <article class="summary_card summary_card_with_actions">
      <p class="summary_label">${person_a.name} Wishes</p>
      <div class="summary_value">${person_a.wish_balance}</div>
      <p class="summary_meta">${person_a_weekly_earned}</p>
      ${render_balance_actions(person_a, person_b, state)}
    </article>
    ${render_pool_card(state)}
    <article class="summary_card summary_card_with_actions">
      <p class="summary_label">${person_b.name} Wishes</p>
      <div class="summary_value">${person_b.wish_balance}</div>
      <p class="summary_meta">${person_b_weekly_earned}</p>
      ${render_balance_actions(person_b, person_a, state)}
    </article>
  `;
}

function get_weekly_earned_display(user) {
  const earned_icons = user.habits
    .filter((habit) => habit.is_reward_claimed)
    .map((habit) => habit.icon)
    .concat(user.weekly_transfer_icons)
    .join(" ");

  return earned_icons ? `+ ${earned_icons} this week` : "+ this week";
}

function render_pool_card(state) {
  const max_pool = 30;
  const water_level = Math.min(100, (state.pool_balance / max_pool) * 100);

  return `
    <article class="summary_card summary_card_pool">
      <p class="summary_label">Wish Pool</p>
      <div class="pool_tank" aria-hidden="true">
        <div class="pool_rim"></div>
        <div class="pool_bowl">
          <div class="pool_water" style="height: ${water_level}%;"></div>
        </div>
      </div>
      <div class="summary_value">${state.pool_balance}</div>
    </article>
  `;
}

function render_balance_actions(current_user, other_user, state) {
  const show_message = state.message_user_id === current_user.user_id && state.ui_message;

  return `
    <div class="balance_actions">
      <button
        class="mini_action_button"
        type="button"
        data-action="wish_action"
        data-action-type="return_to_pool"
        data-user-id="${current_user.user_id}"
        data-target-id="pool"
      >
        Return to Pool
      </button>
      <button
        class="mini_action_button"
        type="button"
        data-action="wish_action"
        data-action-type="give_to_other"
        data-user-id="${current_user.user_id}"
        data-other-user-id="${other_user.user_id}"
        data-target-id="${other_user.user_id}"
      >
        Give to Other
      </button>
      <button
        class="mini_action_button mini_action_button_secondary"
        type="button"
        data-action="wish_action"
        data-action-type="undo_last_action"
        data-user-id="${current_user.user_id}"
      >
        Undo Last Action
      </button>
    </div>
    ${show_message ? `<p class="balance_message">${state.ui_message}</p>` : ""}
  `;
}

function render_week_label(week_start_date) {
  const week_dates = get_week_dates(week_start_date);
  const start_date = format_display_date(week_dates[0]);
  const end_date = format_display_date(week_dates[6]);

  document.getElementById("week_label").textContent = `Current week: ${start_date} to ${end_date}`;
}

function render_trackers(state) {
  const tracker_container = document.getElementById("tracker_container");
  const week_dates = get_week_dates(state.week_start_date);

  tracker_container.innerHTML = state.users
    .map((user) => `
      <article class="tracker_card">
        <div class="tracker_header">
          <div>
            <h3 class="tracker_title">${user.name}</h3>
            <p class="tracker_meta">Auto-earns 1 wish per habit when the weekly target is reached.</p>
          </div>
          <p class="table_hint">Week starts on Monday: ${format_display_date(state.week_start_date)}</p>
        </div>
        <div class="table_wrap">
          <table>
            <thead>
              <tr>
                <th>habit_name</th>
                ${week_dates.map((date_value) => `<th>${format_day_header(date_value)}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${user.habits.map((habit) => render_habit_row(user.user_id, habit, week_dates)).join("")}
            </tbody>
          </table>
        </div>
      </article>
    `)
    .join("");
}

function render_habit_row(user_id, habit, week_dates) {
  const progress_symbols = Array.from({ length: habit.target_per_week }, (_, index) => (
    index < habit.done_count ? habit.icon : "○"
  )).join(" ");

  const day_cells = week_dates
    .map((date_value) => {
      const is_done = Boolean(habit.daily_status[date_value]);

      return `
        <td>
          <button
            class="day_toggle ${is_done ? "is_done" : ""}"
            type="button"
            data_action="toggle_day"
            data-user-id="${user_id}"
            data-habit-id="${habit.habit_id}"
            data-date-value="${date_value}"
            aria-pressed="${is_done}"
            aria-label="Toggle ${habit.display_name} for ${date_value}"
          ></button>
        </td>
      `;
    })
    .join("");

  return `
    <tr>
      <td class="habit_name">
        <span class="habit_title">${habit.display_name}</span>
        <span class="habit_progress">${progress_symbols}</span>
      </td>
      ${day_cells}
    </tr>
  `;
}

function render_actions(state) {
  const actions_container = document.getElementById("actions_container");

  if (actions_container) {
    actions_container.innerHTML = "";
  }
}

async function toggle_habit_day(user_id, habit_id, date_value) {
  console.log("toggle_habit_day called", user_id, habit_id, date_value);
  const state = get_state();
  const user = state.users.find((item) => item.user_id === user_id);

  if (!user) {
    return;
  }

  const habit = user.habits.find((item) => item.habit_id === habit_id);

  if (!habit || !Object.prototype.hasOwnProperty.call(habit.daily_status, date_value)) {
    return;
  }

  habit.daily_status[date_value] = !habit.daily_status[date_value];
  habit.done_count = count_done_days(habit.daily_status);
  sync_reward_status(state, user, habit, state.week_start_date);
  console.log("before save", habit.daily_status, habit.done_count);
  save_state(state);
  await saveBalancesToFirebase(state);
  render_app();
}

function sync_reward_status(state, user, habit, current_week_start) {
  if (habit.done_count >= habit.target_per_week && habit.is_reward_claimed === false) {
    if (state.pool_balance < habit.reward_value) {
      return;
    }

    habit.is_reward_claimed = true;
    habit.earned_at = get_today_date_string();
    state.pool_balance -= habit.reward_value;
    user.wish_balance += habit.reward_value;
    user.total_earned += habit.reward_value;
    return;
  }

  // Reversal is only allowed for the active week and does not recalculate older data.
  if (
    habit.week_start_date === current_week_start &&
    habit.done_count < habit.target_per_week &&
    habit.is_reward_claimed === true
  ) {
    habit.is_reward_claimed = false;
    habit.earned_at = null;
    user.wish_balance = Math.max(0, user.wish_balance - habit.reward_value);
    user.total_earned = Math.max(0, user.total_earned - habit.reward_value);
    state.pool_balance += habit.reward_value;
  }
}

async function perform_balance_action(action_type, action_button) {
  const state = get_state();
  const current_user_id = action_button?.dataset.userId;
  const other_user_id = action_button?.dataset.otherUserId;
  const current_user = state.users.find((user) => user.user_id === current_user_id);
  const other_user = state.users.find((user) => user.user_id === other_user_id);

  state.ui_message = "";
  state.message_user_id = null;
  console.log("perform_balance_action", action_type, current_user_id, other_user_id);

  switch (action_type) {
    case "give_to_other":
      give_to_other(current_user, other_user, state);
      break;
    case "return_to_pool":
      return_to_pool(current_user, state);
      break;
    case "undo_last_action":
      undo_last_action(state);
      break;
    default:
      return;
  }

save_state(state);
await saveBalancesToFirebase(state);
render_app();
}

function give_to_other(from_user, to_user, state) {
  if (!from_user || !to_user) {
    return;
  }

  if (from_user.wish_balance < 1) {
    show_no_wishes_message(state, from_user.user_id);
    return;
  }

  from_user.wish_balance -= 1;
  to_user.wish_balance += 1;
  const transfer_icon = from_user.user_id === "s" ? "👸" : "🐷";

  to_user.weekly_transfer_icons.push(transfer_icon);
  state.last_action = {
    type: "give_to_other",
    from_user_id: from_user.user_id,
    to_user_id: to_user.user_id,
    transfer_icon
  };
}

function return_to_pool(user, state) {
  if (!user) {
    return;
  }

  if (user.wish_balance < 1) {
    show_no_wishes_message(state, user.user_id);
    return;
  }

  user.wish_balance -= 1;
  state.pool_balance += 1;
  state.pool_added_this_week += 1;
  state.last_action = {
    type: "return_to_pool",
    user_id: user.user_id
  };
}

function undo_last_action(state) {
  if (!state.last_action) {
    return;
  }

  if (state.last_action.type === "return_to_pool") {
    const user = state.users.find((item) => item.user_id === state.last_action.user_id);

    if (user && state.pool_balance > 0) {
      user.wish_balance += 1;
      state.pool_balance -= 1;
      state.pool_added_this_week = Math.max(0, state.pool_added_this_week - 1);
    }
  }

  if (state.last_action.type === "give_to_other") {
    const from_user = state.users.find((item) => item.user_id === state.last_action.from_user_id);
    const to_user = state.users.find((item) => item.user_id === state.last_action.to_user_id);

    if (from_user && to_user && to_user.wish_balance > 0) {
      from_user.wish_balance += 1;
      to_user.wish_balance -= 1;
      const icon_index = to_user.weekly_transfer_icons.lastIndexOf(state.last_action.transfer_icon);

      if (icon_index > -1) {
        to_user.weekly_transfer_icons.splice(icon_index, 1);
      }
    }
  }

  state.last_action = null;
}

function show_no_wishes_message(state, user_id) {
  state.ui_message = "No wishes available";
  state.message_user_id = user_id;
}

function count_done_days(daily_status) {
  return Object.values(daily_status).filter(Boolean).length;
}

function get_week_start_date(date_input) {
  const date_value = new Date(date_input);
  const day_of_week = date_value.getDay();
  const monday_offset = day_of_week === 0 ? -6 : 1 - day_of_week;

  // Use a midday timestamp to avoid local timezone edge cases around midnight.
  date_value.setHours(12, 0, 0, 0);
  date_value.setDate(date_value.getDate() + monday_offset);
  return format_storage_date(date_value);
}

function get_week_dates(week_start_date) {
  const week_dates = [];
  const start_date = new Date(`${week_start_date}T12:00:00`);

  for (let index = 0; index < 7; index += 1) {
    const next_date = new Date(start_date);
    next_date.setDate(start_date.getDate() + index);
    week_dates.push(format_storage_date(next_date));
  }

  return week_dates;
}

function format_storage_date(date_input) {
  const year = date_input.getFullYear();
  const month = String(date_input.getMonth() + 1).padStart(2, "0");
  const day = String(date_input.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function get_today_date_string() {
  return format_storage_date(new Date());
}

function format_day_header(date_value) {
  const date_object = new Date(`${date_value}T12:00:00`);
  const weekday = date_object.toLocaleDateString("en-US", { weekday: "short" });
  const month = date_object.getMonth() + 1;
  const day = date_object.getDate();

  return `${weekday} (${month}/${day})`;
}

function format_display_date(date_value) {
  const date_object = new Date(`${date_value}T12:00:00`);
  const month = date_object.getMonth() + 1;
  const day = date_object.getDate();
  const year = date_object.getFullYear();

  return `${month}/${day}/${year}`;
}

loadFromFirebase();
subscribeToFirebaseBalances();