

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
      { habit_id: "s_study", habit_name: "study", display_name: "Study", target_per_week: 3, reward_value: 1 },
      { habit_id: "s_sleep_early", habit_name: "sleep_early", display_name: "Sleep Early", target_per_week: 7, reward_value: 1 },
      { habit_id: "s_workout", habit_name: "workout", display_name: "Workout", target_per_week: 2, reward_value: 1 },
      { habit_id: "s_cooking", habit_name: "cooking", display_name: "Cooking", target_per_week: 3, reward_value: 1 },
      { habit_id: "s_drink_water", habit_name: "drink_water", display_name: "Drink Water", target_per_week: 7, reward_value: 1 },
      { habit_id: "s_dry_hair", habit_name: "dry_hair", display_name: "Dry Hair", target_per_week: 3, reward_value: 1 },
      { habit_id: "s_practice_violin", habit_name: "practice_violin", display_name: "Practice Violin", target_per_week: 2, reward_value: 1 },
      { habit_id: "s_foot_soak", habit_name: "foot_soak", display_name: "Foot Soak", target_per_week: 3, reward_value: 1 }
    ]
  },
  {
    user_id: "kk",
    name: "KK",
    wish_balance: 0,
    total_earned: 0,
    total_spent: 0,
    habits: [
      { habit_id: "kk_workout", habit_name: "workout", display_name: "Workout", target_per_week: 2, reward_value: 1 },
      { habit_id: "kk_study", habit_name: "study", display_name: "Study", target_per_week: 3, reward_value: 1 },
      { habit_id: "kk_reduce_smoking", habit_name: "reduce_smoking", display_name: "Reduce Smoking", target_per_week: 7, reward_value: 1 },
      { habit_id: "kk_didi", habit_name: "didi", display_name: "Didi", target_per_week: 1, reward_value: 1 },
      { habit_id: "kk_sleep_early", habit_name: "sleep_early", display_name: "Sleep Early", target_per_week: 7, reward_value: 1 }
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
    perform_balance_action(action_button.dataset.action_type || action_button.dataset.actionType);
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
        saved_habit.target_per_week !== sample_habit.target_per_week
      );
    });
  });
}

function normalize_balances(state) {
  state.users.forEach((user) => {
    user.wish_balance = Math.max(0, Number(user.wish_balance) || 0);
    user.total_earned = Math.max(0, Number(user.total_earned) || 0);
    user.total_spent = Math.max(0, Number(user.total_spent) || 0);
  });

  const total_user_balance = state.users.reduce((sum, user) => sum + user.wish_balance, 0);
  state.pool_balance = Math.max(0, total_wishes - total_user_balance);
}

function rollover_to_current_week(state, current_week_start) {
  return {
    ...state,
    week_start_date: current_week_start,
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

  summary_section.innerHTML = `
    <article class="summary_card">
      <p class="summary_label">${person_a.name} wish_balance</p>
      <div class="summary_value">${person_a.wish_balance}</div>
    </article>
    <article class="summary_card">
      <p class="summary_label">${person_b.name} wish_balance</p>
      <div class="summary_value">${person_b.wish_balance}</div>
    </article>
    <article class="summary_card">
      <p class="summary_label">Shared pool_balance</p>
      <div class="summary_value">${state.pool_balance}</div>
    </article>
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
                <th>done_count</th>
                <th>target_per_week</th>
                <th>earned_status</th>
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
  const day_cells = week_dates
    .map((date_value) => {
      const is_done = Boolean(habit.daily_status[date_value]);
      const button_label = is_done ? "Done" : "Open";

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
          >
            ${button_label}
          </button>
        </td>
      `;
    })
    .join("");

  return `
    <tr>
      <td class="habit_name">${habit.display_name}</td>
      ${day_cells}
      <td>${habit.done_count}</td>
      <td>${habit.target_per_week}</td>
      <td>
        <span class="earned_badge ${habit.is_reward_claimed ? "is_earned" : ""}">
          ${habit.is_reward_claimed ? "Earned" : "Not yet"}
        </span>
      </td>
    </tr>
  `;
}

function render_actions(state) {
  const person_a = state.users[0];
  const person_b = state.users[1];
  const actions = [
    {
      action_type: "give_a_to_b",
      title: `Give 1 wish from ${person_a.name} to ${person_b.name}`,
      text: `${person_a.name} balance: ${person_a.wish_balance}`,
      disabled: person_a.wish_balance < 1
    },
    {
      action_type: "give_b_to_a",
      title: `Give 1 wish from ${person_b.name} to ${person_a.name}`,
      text: `${person_b.name} balance: ${person_b.wish_balance}`,
      disabled: person_b.wish_balance < 1
    },
    {
      action_type: "move_a_to_pool",
      title: `Move 1 wish from ${person_a.name} to shared pool`,
      text: `${person_a.name} balance: ${person_a.wish_balance}`,
      disabled: person_a.wish_balance < 1
    },
    {
      action_type: "move_b_to_pool",
      title: `Move 1 wish from ${person_b.name} to shared pool`,
      text: `${person_b.name} balance: ${person_b.wish_balance}`,
      disabled: person_b.wish_balance < 1
    },
    {
      action_type: "spend_a",
      title: `Spend 1 wish from ${person_a.name}`,
      text: `${person_a.name} total_spent: ${person_a.total_spent}`,
      disabled: person_a.wish_balance < 1
    },
    {
      action_type: "spend_b",
      title: `Spend 1 wish from ${person_b.name}`,
      text: `${person_b.name} total_spent: ${person_b.total_spent}`,
      disabled: person_b.wish_balance < 1
    },
    {
      action_type: "spend_pool",
      title: "Spend 1 wish from shared pool",
      text: `Shared pool_balance: ${state.pool_balance}`,
      disabled: state.pool_balance < 1
    }
  ];

  document.getElementById("actions_container").innerHTML = actions
    .map((action) => `
      <button
        class="action_button"
        type="button"
        data_action="wish_action"
        data_action_type="${action.action_type}"
        ${action.disabled ? "disabled" : ""}
      >
        <span class="action_title">${action.title}</span>
        <span class="action_text">${action.text}</span>
      </button>
    `)
    .join("");
}

function toggle_habit_day(user_id, habit_id, date_value) {
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

function perform_balance_action(action_type) {
  const state = get_state();
  const person_a = state.users[0];
  const person_b = state.users[1];

  switch (action_type) {
    case "give_a_to_b":
      transfer_between_users(person_a, person_b);
      break;
    case "give_b_to_a":
      transfer_between_users(person_b, person_a);
      break;
    case "move_a_to_pool":
      move_to_pool(person_a, state);
      break;
    case "move_b_to_pool":
      move_to_pool(person_b, state);
      break;
    case "spend_a":
      spend_from_user(person_a);
      break;
    case "spend_b":
      spend_from_user(person_b);
      break;
    case "spend_pool":
      spend_from_pool(state);
      break;
    default:
      return;
  }

  save_state(state);
  render_app();
}

function transfer_between_users(from_user, to_user) {
  if (from_user.wish_balance < 1) {
    return;
  }

  from_user.wish_balance -= 1;
  to_user.wish_balance += 1;
}

function move_to_pool(user, state) {
  if (user.wish_balance < 1) {
    return;
  }

  user.wish_balance -= 1;
  state.pool_balance += 1;
}

function spend_from_user(user) {
  if (user.wish_balance < 1) {
    return;
  }

  user.wish_balance -= 1;
  user.total_spent += 1;
}

function spend_from_pool(state) {
  if (state.pool_balance < 1) {
    return;
  }

  state.pool_balance -= 1;
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
