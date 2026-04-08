from django.db import migrations


COLOUR_UPDATES = [
    {"machine_name": "monoblast",        "old": "#c055b8", "new": "#d9d9d9"},
    {"machine_name": "promonocyte",      "old": "#e080d0", "new": "#a6a6a6"},
    {"machine_name": "immature_monocyte","old": "#a040a0", "new": "#737373"},
    {"machine_name": "mature_monocyte",  "old": "#bfbfbf", "new": "#4d4d4d"},
    {"machine_name": "lymphocytes",      "old": "#ffffff", "new": "#4bacc6"},
    {"machine_name": "lymphoblasts",     "old": "#606060", "new": "#2a6496"},
]


def update_colours(apps, schema_editor):
    CellType = apps.get_model("main", "CellType")
    for entry in COLOUR_UPDATES:
        CellType.objects.filter(machine_name=entry["machine_name"]).update(
            visualisation_colour=entry["new"]
        )


def reverse_update_colours(apps, schema_editor):
    CellType = apps.get_model("main", "CellType")
    for entry in COLOUR_UPDATES:
        CellType.objects.filter(machine_name=entry["machine_name"]).update(
            visualisation_colour=entry["old"]
        )


class Migration(migrations.Migration):

    dependencies = [
        ("main", "0007_add_monocytic_lineage"),
    ]

    operations = [
        migrations.RunPython(update_colours, reverse_update_colours),
    ]
