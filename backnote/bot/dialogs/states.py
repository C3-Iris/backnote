from aiogram.fsm.state import State, StatesGroup


class MainSG(StatesGroup):
    menu = State()
    deadlines = State()
    progress = State()
    settings = State()
    help = State()


class SearchSG(StatesGroup):
    query = State()
    results = State()


class SubjectsSG(StatesGroup):
    list = State()
    view = State()
    edit = State()
    edit_field = State()
    edit_term = State()
    delete = State()


class SubjectCreateSG(StatesGroup):
    title = State()
    term = State()
    link = State()
    description = State()


class LessonsSG(StatesGroup):
    list = State()
    view = State()
    note = State()
    edit = State()
    edit_field = State()
    edit_kind = State()
    edit_date = State()
    delete = State()


class LessonCreateSG(StatesGroup):
    kind = State()
    number = State()
    title = State()
    video = State()


class SummarySG(StatesGroup):
    main = State()
    input = State()
    delete = State()


class MaterialsSG(StatesGroup):
    list = State()
    add = State()
    view = State()
    rename = State()
    delete = State()


class AssignmentsSG(StatesGroup):
    list = State()
    view = State()
    edit = State()
    edit_field = State()
    due_date = State()
    due_time = State()
    delete = State()


class AssignmentCreateSG(StatesGroup):
    title = State()
    due_date = State()
    due_time = State()
    description = State()


class AdminSG(StatesGroup):
    menu = State()
    users = State()
    user = State()
    add = State()
    broadcast = State()
    broadcast_confirm = State()
