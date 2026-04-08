from django.db import migrations


def rename_monocyte(apps, schema_editor):
    CellType = apps.get_model("main", "CellType")
    CellType.objects.filter(machine_name="monocytes").update(
        readable_name="Mature monocyte",
        machine_name="mature_monocyte",
    )


def reverse_rename_monocyte(apps, schema_editor):
    CellType = apps.get_model("main", "CellType")
    CellType.objects.filter(machine_name="mature_monocyte").update(
        readable_name="Monocytes",
        machine_name="monocytes",
    )


class Migration(migrations.Migration):

    dependencies = [
        ("main", "0005_unique_display_order"),
    ]

    operations = [
        migrations.RunPython(rename_monocyte, reverse_rename_monocyte),
    ]
